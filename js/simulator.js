var locations = (function () {
    var absolute = {
        north: "north",
        south: "south",
        east: "east",
        west: "west"
    };

    var relative = {
        left: "left",
        right: "right",
        front: "front",
        back: "back"
    };

    var absoluteFromRelative = {
        north: {
            left: absolute.west,
            right: absolute.east,
            front: absolute.north,
            back: absolute.south
        },
        south: {
            left: absolute.east,
            right: absolute.west,
            front: absolute.south,
            back: absolute.north
        },
        east: {
            left: absolute.north,
            right: absolute.south,
            front: absolute.east,
            back: absolute.west
        },
        west: {
            left: absolute.south,
            right: absolute.north,
            front: absolute.west,
            back: absolute.east
        }
    };

    var relativeFromAbsolute = {
        north: {
            north: relative.front,
            south: relative.back,
            east: relative.right,
            west: relative.left
        },
        south: {
            north: relative.back,
            south: relative.front,
            east: relative.left,
            west: relative.right
        },
        east: {
            north: relative.left,
            south: relative.right,
            east: relative.front,
            west: relative.back
        },
        west: {
            north: relative.right,
            south: relative.left,
            east: relative.back,
            west: relative.front
        }
    };

    var oppositeAbsolute = {
        north: absolute.south,
        south: absolute.north,
        east: absolute.west,
        west: absolute.east
    };

    var oppositeRelative = {
        left: relative.right,
        right: relative.left,
        front: relative.back,
        back: relative.front
    };

    function create(row, column) {
        return {
            row: row,
            column: column,
            north: function () {
                return create(row - 1 < 0 ? 0 : row - 1, column);
            },
            south: function () {
                return create(row + 1 > 14 ? 14 : row + 1, column);
            },
            east: function () {
                return create(row, column + 1 > 14 ? 14 : column + 1);
            },
            west: function () {
                return create(row, column - 1 < 0 ? 0 : column - 1);
            },
            clone: function () {
                return create(row, column);
            },
            compare: function (other, orientation) {
                orientation = orientation || absolute.north;
                var distance = Math.abs(other.row - row) + Math.abs(other.column - column);

                if (other.row > row) {
                    return {
                        absolute: absolute.south,
                        relative: relativeFromAbsolute[orientation][absolute.south],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.row < row) {
                    return {
                        absolute: absolute.north,
                        relative: relativeFromAbsolute[orientation][absolute.north],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.column > column) {
                    return {
                        absolute: absolute.east,
                        relative: relativeFromAbsolute[orientation][absolute.east],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.column < column) {
                    return {
                        absolute: absolute.west,
                        relative: relativeFromAbsolute[orientation][absolute.west],
                        distance: distance,
                        coincident: false
                    };
                } else {
                    return {
                        distance: distance,
                        coincident: true
                    };
                }
            },
            toString: function () {
                return "(" + row + ", " + column + ")";
            }
        };
    }

    return {
        absolute: absolute,
        relative: relative,
        absoluteFromRelative: absoluteFromRelative,
        relativeFromAbsolute: relativeFromAbsolute,
        oppositeAbsolute: oppositeAbsolute,
        oppositeRelative: oppositeRelative,
        create: create
    };
})();

var parser = (function () {

    function peek(arr) {
        return arr[0];
    }

    function tokenize(options) {
        var str = options.str;
        var delimiters = options.delimiters.split("");
        var returnDelimiters = options.returnDelimiters || false;
        var returnEmptyTokens = options.returnEmptyTokens || false;
        var tokens = [];
        var lastTokenIndex = 0;

        for (var i = 0; i < str.length; i++) {
            if (delimiters.indexOf(str.charAt(i)) != -1) {
                token = str.substring(lastTokenIndex, i);

                if (token.length == 0) {
                    if (returnEmptyTokens) {
                        tokens.push(token);
                    }
                } else {
                    tokens.push(token);
                }

                if (returnDelimiters) {
                    tokens.push(str.charAt(i));
                }

                lastTokenIndex = i + 1;
            }
        }

        if (lastTokenIndex < str.length) {
            var token = str.substring(lastTokenIndex, str.length);

            if (token.length == 0) {
                if (returnEmptyTokens) {
                    tokens.push(token);
                }
            } else {
                tokens.push(token);
            }
        }

        return tokens;
    }

    function expect(tokens, expected, expectedToken) {
        expectedToken = arguments.length === 2 ? expected : expectedToken;

        var token = tokens.shift();
        if ((expected instanceof RegExp && expected.test(token)) ||
            (typeof expected === "string" && expected === token)) {
            return {
                successful: true,
                data: token
            };
        } else {
            return {
                successful: false,
                message: "Expected " + expectedToken + " but found: " + token,
                data: null
            };
        }
    }

    function parse(navigationInstructions) {
        var result = instructions(tokenize({
            str: navigationInstructions.replace(/[\n\s]/g, ""),
            delimiters: "(),",
            returnDelimiters: true,
            returnEmptyTokens: false
        }));

        if (!result.successful) {
            throw result.message;
        }

        return result.data;
    }

    function instructions(tokens) {
        var result = {
            successful: true,
            message: "",
            data: null
        };

        var parsedInstructions = [];
        while (tokens.length > 0 && result.successful) {
            result = instruction(tokens);
            parsedInstructions.push(result.data);
        }

        result.data = parsedInstructions;
        return result;
    }

    function instruction(tokens) {
        var tokenToFunction = {
            start: start,
            turn: turn,
            move: move,
            verify: verify
        };

        var token = tokens.shift();
        if (!tokenToFunction[token]) {
            return {
                successful: false,
                message: "Unrecognized instruction: " + token,
                data: null
            };
        } else {
            return tokenToFunction[token](tokens);
        }
    }

    function start(tokens) {
        var result = {
            successful: true,
            data: null
        };

        var check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, /^\d+/, "a number");
        if (!check.successful) {
            return check;
        }

        result.data = {
            instruction: "start",
            arguments: {
                row: check.data,
                column: -1
            }
        };

        check = expect(tokens, ",");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, /^\d+/, "a number");
        if (!check.successful) {
            return check;
        }

        result.data.arguments.column = check.data;

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function turn(tokens) {
        var result = {
            successful: true,
            message: "",
            data: null
        };

        var check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        if (peek(tokens) === "until") {
            result = until(tokens);
            if (!result.successful) {
                return result;
            }

            result.data = {
                instruction: "turn",
                arguments: {
                    until: result.data
                }
            };
        } else {
            var token = tokens.shift();
            if (!locations.absolute[token] && !locations.relative[token]) {
                return {
                    successful: false,
                    message: "Expected a relative or absolute direction but got: " + token,
                    data: null
                };
            }

            result.data = {
                instruction: "turn",
                arguments: {
                    direction: token
                }
            };
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function until(tokens) {
        var check = expect(tokens, "until", "\"until\"");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        var result = conditions(tokens);
        if (!result.successful) {
            return result;
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function conditions(tokens) {
        var result = condition(tokens);

        if (!result.successful) {
            return result;
        }

        var conditions = [result.data];
        while (peek(tokens) === "," && result.successful) {
            tokens.shift();

            result = condition(tokens);
            conditions.push(result.data);
        }

        if (!result.successful) {
            return result;
        }

        return {
            successful: true,
            message: "",
            data: conditions
        };
    }

    function condition(tokens) {
        var check = expect(tokens, "is", "\"is\"");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        var result = object(tokens);
        if (!result.successful) {
            return result;
        }

        var _object = result.data;
        if (peek(tokens) === ",") {
            tokens.shift();

            result = orientationDefinition(tokens);
            if (!result.successful) {
                return result;
            }

            result = {
                successful: true,
                data: {
                    object: _object,
                    orientation: result.data
                }
            };
        } else {
            result = {
                successful: true,
                data: {
                    object: _object
                }
            };
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function object(tokens) {
        var result = {
            successful: true,
            message: "",
            data: null
        };

        var check = expect(tokens, /^[a-z]+$/, "a valid object name");
        if (!check.successful) {
            return check;
        }

        var name = check.data;
        if (peek(tokens) === "(") {
            tokens.shift();

            result = attribute(tokens);
            if (!result.successful) {
                return result;
            }

            var attributes = [result.data];
            while (peek(tokens) === "," && result.successful) {
                tokens.shift();

                result = attribute(tokens);
                attributes.push(result.data);
            }

            check = expect(tokens, ")");
            if (!check.successful) {
                return check;
            }

            result = {
                successful: true,
                data: {
                    name: name,
                    attributes: attributes
                }
            };
        } else {
            result = {
                successful: true,
                data: {
                    name: name
                }
            };
        }

        return result;
    }

    function attribute(tokens) {
        var check = expect(tokens, /^[a-z]+$/, "a valid object name or adjective");
        if (!check.successful) {
            return check;
        }

        if (peek(tokens) === "(") {
            tokens.unshift(check.data);
            return object(tokens);
        }

        return {
            successful: true,
            data: check.data
        };
    }

    function orientationDefinition(tokens) {
        var check = expect(tokens, "at", "\"at\"");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        var result = orientation(tokens);
        if (!result.successful) {
            return result;
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function orientation(tokens) {
        var result = {
            successful: true,
            data: null
        };

        var token = tokens.shift();
        if (peek(tokens) === ",") {
            tokens.shift();

            if (!locations.absolute[token] && !locations.relative[token]) {
                return {
                    successful: false,
                    message: "Expected an absolute or relative direction but got: " + token,
                    data: null
                };
            }

            var direction = token;
            result = distance(tokens);
            if (!result.successful) {
                return result;
            }

            result = {
                successful: true,
                data: {
                    direction: direction,
                    distance: result.data
                }
            };
        } else if (peek(tokens) === "(") {
            tokens.unshift(token);

            result = distance(tokens);
            if (!result.successful) {
                return result;
            }

            result = {
                successful: true,
                data: {
                    distance: result.data
                }
            };
        } else {
            result = {
                successful: true,
                data: {
                    direction: token
                }
            };
        }

        return result;
    }

    function distance(tokens) {
        var check = expect(tokens, /^[a-z]+$/, "a valid unit");
        if (!check.successful) {
            return check;
        }

        var unit = check.data;
        check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, /^[0-9]+$/, "a number");
        if (!check.successful) {
            return check;
        }

        var result = {
            successful: true,
            data: {
                unit: unit,
                magnitude: check.data
            }
        };

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function move(tokens) {
        var result = {
            successful: true,
            message: "",
            data: null
        };

        var check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        if (peek(tokens) === "until") {
            result = until(tokens);
            if (!result.successful) {
                return result;
            }

            result.data = {
                instruction: "move",
                arguments: {
                    until: result.data
                }
            };
        } else {
            result = distance(tokens);
            if (!result.successful) {
                return result;
            }

            result.data = {
                instruction: "move",
                arguments: {
                    distance: result.data
                }
            };
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    function verify(tokens) {
        var check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        var result = that(tokens);
        if (!result.successful) {
            return result;
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        result.data = {
            instruction: "verify",
            arguments: {
                that: result.data
            }
        };

        return result;
    }

    function that(tokens) {
        var check = expect(tokens, "that", "\"that\"");
        if (!check.successful) {
            return check;
        }

        check = expect(tokens, "(");
        if (!check.successful) {
            return check;
        }

        var result = conditions(tokens);
        if (!result.successful) {
            return result;
        }

        check = expect(tokens, ")");
        if (!check.successful) {
            return check;
        }

        return result;
    }

    return {
        parse: parse
    };
})();

var world = (function () {
    var worldTemplate =
        "W3P2W3W3w0W3W3w1P0W3w2W3W3P3W1" +
        "PP                          LL" +
        "W3  W4W4W4W4W4W4  W4W4W4W4  W1" +
        "W3  W4XXXXXXXXPP  ~1~1~1~1  W1" +
        "P4  W4XXXXXXXXW4  W2W2W2W2  W1" +
        "W3  W4LLW4XXXXD5  ~0~0~0~0  W1" +
        "W3      W4XXXXW4  W0W0W0W0  W1" +
        "W3LLW3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXW3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXP0  W4XXXXD3  W0XXXXD4  P1" +
        "XXXXW3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXD2  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXW3  W4W4D1W4  W0W0W0W0  W1" +
        "XXXXPP                      W1" +
        "XXXXW3W1W1W1W1W1D0W1W1W1W1PPW1";

    var ROWS = 15;
    var COLUMNS = 15;

    var objects = {
        W: {
            name: "wall",
            path: false,
            space: false,
            reference: true,
            attributes: ["red", "blue", "green", "yellow", "grey"]
        },
        D: {
            name: "door",
            path: false,
            space: false,
            reference: true,
            attributes: ["main", "open", "locked", "glass", "steel", "red"]
        },
        P: {
            name: "painting",
            path: false,
            space: false,
            reference: true,
            attributes: ["old", "abstract", "classic", "modern", "famous"]
        },
        w: {
            name: "window",
            attributes: ["open", "closed", "blue"]
        },
        "~": {
            name: "hallway",
            path: true,
            space: true,
            reference: true,
            attributes: [{
                name: "carpet",
                attribute: "red"
            }, {
                name: "carpet",
                attribute: "blue"
            }]
        },
        PP: {
            name: "plant",
            attribute: "potted",
            path: false,
            space: false,
            reference: true
        },
        LL: {
            name: "lamp",
            attribute: null,
            path: false,
            space: false,
            reference: true
        },
        XX: {
            path: false,
            space: true,
            reference: false
        }
    };

    var grid = worldTemplate.match(/.{30}/g).reduce(function (grid, line) {
        grid.push(line.match(/.{2}/g).reduce(function (row, cell) {
            if (/[A-Z~][0-9]/i.test(cell)) {
                var object = objects[cell.split("")[0]];
                row.push({
                    name: object.name,
                    path: object.name === "hallway",
                    space: object.name === "hallway",
                    reference: true,
                    attribute: object.attributes[cell.split("")[1]]
                });
            } else if (/[A-Z]{2}/.test(cell)) {
                row.push(objects[cell]);
            } else {
                row.push({
                    path: true,
                    space: true,
                    reference: false
                });
            }

            return row;
        }, []));

        return grid;
    }, []);

    var startingPoints = grid.reduce(function (startingPoints, objects, row) {
        objects.forEach(function (object, column) {
            if (object.path) {
                startingPoints.push(locations.create(row, column));
            }
        });

        return startingPoints;
    }, []);

    function render() {
        var table = document.getElementById("world");
        grid.forEach(function (objects) {
            var row = document.createElement("tr");
            objects.forEach(function (object) {
                var cell = document.createElement("td");
                if (!object.space || object.name === "hallway") {
                    if (object.name !== "hallway") {
                        cell.style.backgroundImage = "url(images/" + object.name + "/" + (object.attribute || object.name) + ".jpg)";
                    } else {
                        cell.style.backgroundImage = "url(images/" + object.attribute.name + "/" + object.attribute.attribute + ".jpg)";
                        cell.style.opacity = "0.5";
                        cell.style.backgroundColor = "#d0d0d0";
                    }

                    cell.style.backgroundSize = "100%";
                } else if (!object.path) {
                    cell.style.backgroundColor = "#ffffff";
                } else {
                    cell.style.backgroundColor = "#d0d0d0";
                }

                object.cell = cell;

                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    }

    return {
        startingPoints: startingPoints,
        objectAt: function (location) {
            return grid[location.row][location.column];
        },
        isBlocked: function (location) {
            return grid[location.row][location.column].reference && !grid[location.row][location.column].path;
        },
        render: render
    };
})();

String.prototype.interpolate = function () {
    var values = arguments;
    return this.replace(/\{([0-9])\}/g, function ($0, $1) {
        return values[$1];
    });
};

Array.range = function (start, end) {
    var arr = [];
    for (var i = start; i < end; i++) {
        arr.push(i);
    }

    return arr;
};

var robot = (function (world) {
    var dalek = null;

    var _location = world.startingPoints[Math.floor(Math.random() * world.startingPoints.length)];
    var _orientation = locations.absolute.north;

    function scan() {
        var sensorData = {
            orientation: _orientation,
            immediate: immediateScan(_location),
            lineOfSight: {
                north: {
                    objects: [],
                    turnPoints: []
                },
                south: {
                    objects: [],
                    turnPoints: []
                },
                east: {
                    objects: [],
                    turnPoints: []
                },
                west: {
                    objects: [],
                    turnPoints: []
                }
            }
        };

        ["north", "south", "east", "west"].forEach(function (absoluteDirection) {
            var currentLocation = _location[absoluteDirection]();
            while (!world.isBlocked(currentLocation)) {
                var scanData = immediateScan(currentLocation);
                var turnPointPaths = scanData.paths.filter(function (path) {
                    return absoluteDirection !== path && absoluteDirection !== locations.oppositeAbsolute[path];
                });

                sensorData.lineOfSight[absoluteDirection].objects = sensorData.lineOfSight[absoluteDirection].objects.concat(scanData.objects);
                if (turnPointPaths.length > 0) {
                    sensorData.lineOfSight[absoluteDirection].turnPoints = sensorData.lineOfSight[absoluteDirection].turnPoints.concat({
                        location: currentLocation.clone(),
                        paths: turnPointPaths
                    });
                }

                currentLocation = currentLocation[absoluteDirection]();
            }
        });

        function immediateScan(location) {
            var objects = [];
            var paths = [];

            ["north", "south", "east", "west"].forEach(function (absoluteDirection) {
                var currentLocation = location[absoluteDirection]();
                if (world.objectAt(currentLocation).reference) {
                    var object = world.objectAt(currentLocation);
                    objects.push({
                        name: object.name,
                        attribute: object.attribute,
                        position: {
                            row: currentLocation.row,
                            column: currentLocation.column,
                            absolute: locations.absolute[absoluteDirection],
                            relative: locations.relativeFromAbsolute[_orientation][absoluteDirection]
                        }
                    });
                }
            });

            ["north", "south", "east", "west"].forEach(function (absoluteDirection) {
                var currentLocation = location[absoluteDirection]();
                if (world.objectAt(currentLocation).path) {
                    paths.push(absoluteDirection);
                }
            });

            return {
                objects: objects,
                paths: paths
            };
        }

        return sensorData;
    }

    function formal() {
        function checkattribute(references, type) {
            var output;
            switch (type) {
                case "turn":
                    if (references.attribute == null) {
                        output = "turn(until(is(" + references.name + ", at(" + references.direction + "))))";
                    }
                    else if (typeof references.attribute === "string") {
                        output = "turn(until(is(" + references.name + "(" + references.attribute + "), at(" + references.direction + "))))";
                    }
                    else {
                        output = "turn(until(is(" + references.name + "(" + references.attribute.name + "(" + references.attribute.attribute + ")), at(" + references.direction + "))))";
                    }
                    break;
                case "move":
                    if (references.attribute == null) {
                        output = "move(until(is(" + references.name + ", at(" + references.direction + "))))";
                    }
                    else if (typeof references.attribute === "string") {
                        output = "move(until(is(" + references.name + "(" + references.attribute + "), at(" + references.direction + "))))";
                    }
                    else {
                        output = "move(until(is(" + references.name + "(" + references.attribute.name + "(" + references.attribute.attribute + ")), at(" + references.direction + "))))";
                    }
                    break;
                case "verify":
                    if (references.attribute == null) {
                        output = "verify(that(is(" + references.name + ", at(" + references.direction + ",spaces(" + references.distance + ")))))";
                    }
                    else if (typeof references.attribute === "string") {
                        output = "verify(that(is(" + references.name + "(" + references.attribute + "), at(" + references.direction + ",spaces(" + references.distance + ")))))";
                    }
                    else {
                        output = "verify(that(is(" + references.name + "(" + references.attribute.name + "(" + references.attribute.attribute + ")), at(" + references.direction + ",spaces(" + references.distance + ")))))";
                    }
                    break;

            }
            return output;
        }

        var paths = generatePath();

        var result = [];
        result.push("start(" + paths[0].location.row + "," + paths[0].location.column + ")");
        var orientation = locations.absolute.north;

        for (var i = 0; i < paths.length - 1; i++) {
            var direction = paths[i].location.compare(paths[i + 1].location, orientation);
            if (paths[i].turnSource.type == "unconditional") {
                if (paths[i].turnSource.useRelativeDirection) {
                    orientation = direction.absolute;
                    result.push("turn(" + direction.relative + ")");
                    result.push("move(steps(" + direction.distance + "))");

                }
                else {
                    orientation = direction.absolute;
                    result.push("turn(" + direction.absolute + ")");
                    result.push("move(steps(" + direction.distance + "))");
                }

            }
            else {
                var outstring;
                outstring = checkattribute(paths[i].turnSource.reference, "turn");
                result.push(outstring);
                if (paths[i + 1].moveDestination.type == "unconditional") {
                    result.push("move(steps(" + direction.distance + "))");
                }
                else {
                    outstring = checkattribute(paths[i + 1].moveDestination.reference, "move");
                    result.push(outstring);

                }
                if (paths[i + 1].verifyDestination) {
                    outstring = checkattribute(paths[i + 1].verifyDestination.reference, "verify");
                    result.push(outstring);

                }

                orientation = direction.absolute;
            }
        }

        return result;
    }

    function generateFormal(paths) {
        var templates = {
            start: "start({0}, {1})",
            turn: {
                unconditional: "turn({0})",
                conditional: {
                    withoutAttribute: "turn(until(is({0}, at({1}))))",
                    withAttribute: "turn(until(is({0}({1}), at({2}))))",
                    withNestedAttribute: "turn(until(is({0}({1}({2})), at({3}))))"
                }
            },
            move: {
                unconditional: "move(steps({0}))",
                conditional: {
                    withoutDirection: {
                        withoutAttribute: "move(until(is({0})))",
                        withAttribute: "move(until(is({0}({1}))))",
                        withNestedAttribute: "move(until(is({0}({1}({2})))))"
                    },
                    withDirection: {
                        withoutAttribute: "move(until(is({0}, at({1}))))",
                        withAttribute: "move(until(is({0}({1}), at({2}))))",
                        withNestedAttribute: "move(until(is({0}({1}({2})), at({3}))))"
                    }
                }
            },
            verify: {
                withoutDirectionAndDistance: {
                    withoutAttribute: "verify(that(is({0})))",
                    withAttribute: "verify(that(is({0}({1}))))",
                    withNestedAttribute: "verify(that(is({0}({1}({2})))))"
                },
                withDirection: {
                    withoutAttribute: "verify(that(is({0}, at({1}))))",
                    withAttribute: "verify(that(is({0}({1})m at({2}))))",
                    withNestedAttribute: "verify(that(is({0}({1}({2})), at({3}))))"
                },
                withDirectionAndDistance: {
                    withoutAttribute: "verify(that(is({0}, at({1}, steps({2})))))",
                    withAttribute: "verify(that(is({0}({1}), at({2}, steps({3})))))",
                    withNestedAttribute: "verify(that(is({0}({1}({2})), at({3}, steps({4})))))"
                }

            }
        };

        var instructions = [];
        var orientation = locations.absolute.north;
        for (var i = 0; i < paths.length - 1; i++) {

            var source = paths[i];
            var sourceLocation = locations.create(source.location.row, source.location.column);

            var destination = paths[i + 1];
            var destinationLocation = locations.create(destination.location.row, destination.location.column);

            var comparison = sourceLocation.compare(destinationLocation, orientation);
            orientation = comparison.absolute;

            if (i === 0) {
                instructions.push(templates.start.interpolate(source.location.row, source.location.column));
            }

            var direction;

            if (source.turnSource.type === "unconditional") {
                instructions.push(templates.turn.unconditional.interpolate(source.turnSource.useRelativeDirection ? comparison.relative : comparison.absolute));
            } else {
                var turnReference = source.turnSource.reference;
                console.log(orientation, sourceLocation.toString(), destinationLocation.toString());

                direction = source.turnSource.useRelativeDirection ? locations.relativeFromAbsolute[orientation][turnReference.direction] : turnReference.direction;
                if (turnReference.attribute === null) {
                    instructions.push(templates.turn.conditional.withoutAttribute.interpolate(turnReference.name, direction));
                } else if (typeof turnReference.attribute === "string") {
                    instructions.push(templates.turn.conditional.withAttribute.interpolate(turnReference.name, turnReference.attribute, direction));
                } else {
                    instructions.push(templates.turn.conditional.withNestedAttribute.interpolate(turnReference.name, turnReference.attribute.name, turnReference.attribute.attribute, direction));
                }
            }

            if (destination.moveDestination.type === "unconditional") {
                instructions.push(templates.move.unconditional.interpolate(comparison.distance));
            } else {
                var moveReference = destination.moveDestination.reference;

                if (typeof moveReference.direction === "undefined") {
                    if (moveReference.attribute === null) {
                        instructions.push(templates.move.conditional.withoutDirection.withoutAttribute.interpolate(moveReference.name));
                    } else if (typeof moveReference.attribute === "string") {
                        instructions.push(templates.move.conditional.withoutDirection.withAttribute.interpolate(moveReference.name, moveReference.attribute));
                    } else {
                        instructions.push(templates.move.conditional.withoutDirection.withNestedAttribute.interpolate(moveReference.name, moveReference.attribute.name, moveReference.attribute.attribute));
                    }
                } else {
                    direction = destination.moveDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][moveReference.direction] : moveReference.direction;
                    if (moveReference.attribute === null) {
                        instructions.push(templates.move.conditional.withDirection.withoutAttribute.interpolate(moveReference.name, direction));
                    } else if (typeof moveReference.attribute === "string") {
                        instructions.push(templates.move.conditional.withDirection.withAttribute.interpolate(moveReference.name, moveReference.attribute, direction));
                    } else {
                        instructions.push(templates.move.conditional.withDirection.withNestedAttribute.interpolate(moveReference.name, moveReference.attribute.name, moveReference.attribute.attribute, direction));
                    }
                }
            }

            if (i === paths.length - 2) {
                var verifyReference = destination.verifyDestination.reference;

                if (typeof verifyReference.direction === "undefined" && typeof verifyReference.distance === "undefined") {
                    if (verifyReference.attribute === null) {
                        instructions.push(templates.verify.withoutDirectionAndDistance.withoutAttribute.interpolate(verifyReference.name, direction, verifyReference.distance));
                    } else if (typeof verifyReference.attribute === "string") {
                        instructions.push(templates.verify.withoutDirectionAndDistance.withAttribute.interpolate(verifyReference.name, verifyReference.attribute, direction, verifyReference.distance));
                    } else {
                        instructions.push(templates.verify.withoutDirectionAndDistance.withNestedAttribute.interpolate(verifyReference.name, verifyReference.attribute.name, verifyReference.attribute.attribute, direction, verifyReference.distance));
                    }
                } else if (typeof verifyReference.direction !== "undefined" && typeof verifyReference.distance === "undefined") {
                    direction = destination.verifyDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][verifyReference.direction] : verifyReference.direction;
                    if (verifyReference.attribute === null) {
                        instructions.push(templates.verify.withDirection.withoutAttribute.interpolate(verifyReference.name, direction));
                    } else if (typeof verifyReference.attribute === "string") {
                        instructions.push(templates.verify.withDirection.withAttribute.interpolate(verifyReference.name, verifyReference.attribute, direction));
                    } else {
                        instructions.push(templates.verify.withDirection.withNestedAttribute.interpolate(verifyReference.name, verifyReference.attribute.name, verifyReference.attribute.attribute, direction));
                    }
                } else if (typeof verifyReference.direction !== "undefined" && typeof verifyReference.distance !== "undefined") {
                    direction = destination.verifyDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][verifyReference.direction] : verifyReference.direction;
                    if (verifyReference.attribute === null) {
                        instructions.push(templates.verify.withDirectionAndDistance.withoutAttribute.interpolate(verifyReference.name, direction, verifyReference.distance));
                    } else if (typeof verifyReference.attribute === "string") {
                        instructions.push(templates.verify.withDirectionAndDistance.withAttribute.interpolate(verifyReference.name, verifyReference.attribute, direction, verifyReference.distance));
                    } else {
                        instructions.push(templates.verify.withDirectionAndDistance.withNestedAttribute.interpolate(verifyReference.name, verifyReference.attribute.name, verifyReference.attribute.attribute, direction, verifyReference.distance));
                    }
                }
            }
        }

        return instructions;
    }

    function generateEnglish(paths) {
        var templates = {
            turn: {
                unconditional: [
                    {
                        text: "face {0}",
                        fragment: false,
                        relationalOnly: false
                    },
                    {
                        text: "turn {0}",
                        fragment: false,
                        relationalOnly: false
                    },
                    {
                        text: "facing {0}",
                        fragment: true,
                        relationalOnly: false
                    },
                    {
                        text: "turn to the {0}",
                        fragment: false,
                        relationalOnly: false
                    },
                    {
                        text: "face to the {0}",
                        fragment: false,
                        relationalOnly: false
                    },
                    {
                        text: "take a {0}",
                        fragment: false,
                        relationalOnly: true
                    },
                    {
                        text: "face to your {0}",
                        fragment: false,
                        relationalOnly: true
                    },
                    {
                        text: "turn to your {0}",
                        fragment: false,
                        relationalOnly: true
                    }
                ],
                conditional: {
                    withoutAttribute: [
                        {
                            text: "face away from the {0}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "turn away from the {0}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "with the {0} on your {1}",
                            fragment: true,
                            relationalOnly: true
                        },
                        {
                            text: "with the {0} on the {1}",
                            fragment: true,
                            relationalOnly: true
                        }
                    ],
                    withAttribute: [
                        {
                            text: "face away from the {0} {1}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "turn away from the {0} {1}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "with the {0} {1} on your {2}",
                            fragment: true,
                            relationalOnly: true
                        },
                        {
                            text: "with the {0} {1} on the {2}",
                            fragment: true,
                            relationalOnly: true
                        }
                    ],
                    withNestedAttribute: [
                        {
                            text: "face away from the {0} with {1} {2}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "turn away from the {0} with {1} {2}",
                            fragment: false,
                            relationalOnly: false
                        },
                        {
                            text: "with the {0} with {1} {2} on your {3}",
                            fragment: true,
                            relationalOnly: true
                        },
                        {
                            text: "with the {0} with {1} {2} on the {3}",
                            fragment: true,
                            relationalOnly: true
                        }
                    ]
                }
            },
            move: {
                unconditional: [
                    "move {0} steps",
                    "walk {0} steps",
                    "go {0} steps"
                ],
                conditional: {
                    withoutDirection: {
                        withoutAttribute: [
                            "walk until you are at the {0}",
                            "go until you are at the {0}",
                            "move until you are at the {0}",
                            "walk until you are by the {0}",
                            "go until you are by the {0}",
                            "move until you are by the {0}",
                            "walk until you see the {0}",
                            "go until you see the {0}",
                            "move until you see the {0}",
                            "walk until you are at a {0}",
                            "go until you are at a {0}",
                            "move until you are at a {0}",
                            "walk until you are by a {0}",
                            "go until you are by a {0}",
                            "move until you are by a {0}",
                            "walk until you see a {0}",
                            "go until you see a {0}",
                            "move until you see a {0}"
                        ],
                        withAttribute: [
                            "walk until you are at the {0} {1}",
                            "go until you are at the {0} {1}",
                            "move until you are at the {0} {1}",
                            "walk until you are by the {0} {1}",
                            "go until you are by the {0} {1}",
                            "move until you are by the {0} {1}",
                            "walk until you see the {0} {1}",
                            "go until you see the {0} {1}",
                            "move until you see the {0} {1}",
                            "walk until you are at a {0} {1}",
                            "go until you are at a {0} {1}",
                            "move until you are at a {0} {1}",
                            "walk until you are by a {0} {1}",
                            "go until you are by a {0} {1}",
                            "move until you are by a {0} {1}",
                            "walk until you see a {0} {1}",
                            "go until you see a {0} {1}",
                            "move until you see a {0} {1}"
                        ],
                        withNestedAttribute: [
                            "walk until you are at the {0} with {1} {2}",
                            "go until you are at the {0} with {1} {2}",
                            "move until you are at the {0} with {1} {2}",
                            "walk until you are by the {0} with {1} {2}",
                            "go until you are by the {0} with {1} {2}",
                            "move until you are by the {0} with {1} {2}",
                            "walk until you see the {0} with {1} {2}",
                            "go until you see the {0} with {1} {2}",
                            "move until you see the {0} with {1} {2}",
                            "walk until you are at a {0} with {1} {2}",
                            "go until you are at a {0} with {1} {2}",
                            "move until you are at a {0} with {1} {2}",
                            "walk until you are by a {0} with {1} {2}",
                            "go until you are by a {0} with {1} {2}",
                            "move until you are by a {0} with {1} {2}",
                            "walk until you see a {0} with {1} {2}",
                            "go until you see a {0} with {1} {2}",
                            "move until you see a {0} with {1} {2}"
                        ]
                    },
                    withDirection: {
                        withoutAttribute: [
                            "walk until you are in front of the {0}",
                            "go until you are in front of the {0}",
                            "move until you are in front of the {0}",
                            "walk until the {0} is at the {1}",
                            "go until the {0} is at the {1}",
                            "move until the {0} is at the {1}",
                            "walk until the {0} is at your {1}",
                            "go until the {0} is at your {1}",
                            "move until the {0} is at your {1}",
                            "walk until the {0} is to the {1}",
                            "go until the {0} is to the {1}",
                            "move until the {0} is to the {1}",
                            "walk until the {0} is to your {1}",
                            "go until the {0} is to your {1}",
                            "move until the {0} is to your {1}",
                            "walk until the {0} is to the {1} of you",
                            "go until the {0} is to the {1} of you",
                            "move until the {0} is to the {1} of you",
                            "walk until you are in front of a {0}",
                            "go until you are in front of a {0}",
                            "move until you are in front of a {0}",
                            "walk until a {0} is at the {1}",
                            "go until a {0} is at the {1}",
                            "move until a {0} is at the {1}",
                            "walk until a {0} is at your {1}",
                            "go until a {0} is at your {1}",
                            "move until a {0} is at your {1}",
                            "walk until a {0} is to the {1}",
                            "go until a {0} is to the {1}",
                            "move until a {0} is to the {1}",
                            "walk until a {0} is to your {1}",
                            "go until a {0} is to your {1}",
                            "move until a {0} is to your {1}",
                            "walk until a {0} is to the {1} of you",
                            "go until a {0} is to the {1} of you",
                            "move until a {0} is to the {1} of you"
                        ],
                        withAttribute: [
                            "walk until you are in front of the {0} {1}",
                            "go until you are in front of the {0} {1}",
                            "move until you are in front of the {0} {1}",
                            "walk until the {0} {1} is at the {2}",
                            "go until the {0} {1} is at the {2}",
                            "move until the {0} {1} is at the {2}",
                            "walk until the {0} {1} is at your {2}",
                            "go until the {0} {1} is at your {2}",
                            "move until the {0} {1} is at your {2}",
                            "walk until the {0} {1} is to the {2}",
                            "go until the {0} {1} is to the {2}",
                            "move until the {0} {1} is to the {2}",
                            "walk until the {0} {1} is to your {2}",
                            "go until the {0} {1} is to your {2}",
                            "move until the {0} {1} is to your {2}",
                            "walk until the {0} {1} is to the {2} of you",
                            "go until the {0} {1} is to the {2} of you",
                            "move until the {0} {1} is to the {2} of you",
                            "walk until you are in front of a {0} {1}",
                            "go until you are in front of a {0} {1}",
                            "move until you are in front of a {0} {1}",
                            "walk until a {0} {1} is at the {2}",
                            "go until a {0} {1} is at the {2}",
                            "move until a {0} {1} is at the {2}",
                            "walk until a {0} {1} is at your {2}",
                            "go until a {0} {1} is at your {2}",
                            "move until a {0} {1} is at your {2}",
                            "walk until a {0} {1} is to the {2}",
                            "go until a {0} {1} is to the {2}",
                            "move until a {0} {1} is to the {2}",
                            "walk until a {0} {1} is to your {2}",
                            "go until a {0} {1} is to your {2}",
                            "move until a {0} {1} is to your {2}",
                            "walk until a {0} {1} is to the {2} of you",
                            "go until a {0} {1} is to the {2} of you",
                            "move until a {0} {1} is to the {2} of you"
                        ],
                        withNestedAttribute: [
                            "walk until you are in front of the {0} with {1} {2}",
                            "go until you are in front of the {0} with {1} {2}",
                            "move until you are in front of the {0} with {1} {2}",
                            "walk until the {0} with {1} {2} is at the {3}",
                            "go until the {0} with {1} {2} is at the {3}",
                            "move until the {0} with {1} {2} is at the {3}",
                            "walk until the {0} with {1} {2} is at your {3}",
                            "go until the {0} with {1} {2} is at your {3}",
                            "move until the {0} with {1} {2} is at your {3}",
                            "walk until the {0} with {1} {2} is to the {3}",
                            "go until the {0} with {1} {2} is to the {3}",
                            "move until the {0} with {1} {2} is to the {3}",
                            "walk until the {0} with {1} {2} is to your {3}",
                            "go until the {0} with {1} {2} is to your {3}",
                            "move until the {0} with {1} {2} is to your {3}",
                            "walk until the {0} with {1} {2} is to the {3} of you",
                            "go until the {0} with {1} {2} is to the {3} of you",
                            "move until the {0} with {1} {2} is to the {3} of you",
                            "walk until you are in front of a {0} with {1} {2}",
                            "go until you are in front of a {0} with {1} {2}",
                            "move until you are in front of a {0} with {1} {2}",
                            "walk until a {0} with {1} {2} is at the {3}",
                            "go until a {0} with {1} {2} is at the {3}",
                            "move until a {0} with {1} {2} is at the {3}",
                            "walk until a {0} with {1} {2} is at your {3}",
                            "go until a {0} with {1} {2} is at your {3}",
                            "move until a {0} with {1} {2} is at your {3}",
                            "walk until a {0} with {1} {2} is to the {3}",
                            "go until a {0} with {1} {2} is to the {3}",
                            "move until a {0} with {1} {2} is to the {3}",
                            "walk until a {0} with {1} {2} is to your {3}",
                            "go until a {0} with {1} {2} is to your {3}",
                            "move until a {0} with {1} {2} is to your {3}",
                            "walk until a {0} with {1} {2} is to the {3} of you",
                            "go until a {0} with {1} {2} is to the {3} of you",
                            "move until a {0} with {1} {2} is to the {3} of you"
                        ]
                    }
                }
            },
            verify: {
                withoutDirectionAndDistance: {
                    withoutAttribute: [
                        "you should be by a {0}",
                        "you should be at a {0}",
                        "you should be by the {0}",
                        "you should be at the {0}",
                        "you should see a {0}",
                        "you should see the {0}",
                        "there should be a {0}"
                    ],
                    withAttribute: [
                        "you should be by a {0} {1}",
                        "you should be at a {0} {1}",
                        "you should be by the {0} {1}",
                        "you should be at the {0} {1}",
                        "you should see a {0} {1}",
                        "you should see the {0} {1}",
                        "there should be a {0} {1}"
                    ],
                    withNestedAttribute: [
                        "you should be by a {0} with {1} {2}",
                        "you should be at a {0} with {1} {2}",
                        "you should be by the {0} with {1} {2}",
                        "you should be at the {0} with {1} {2}",
                        "you should see a {0} with {1} {2}",
                        "you should see the {0} with {1} {2}",
                        "there should be a {0} with {1} {2}"
                    ]
                },
                withDirection: {
                    withoutAttribute: [
                        "you should be in front of a {0}",
                        "there should be a {0} at the {1}",
                        "there should be a {0} at your {1}",
                        "there should be a {0} to the {1}",
                        "there should be a {0} to your {1}",
                        "there should be a {0} to the {1} of you"
                    ],
                    withAttribute: [
                        "you should be in front of a {0} {1}",
                        "there should be a {0} {1} at the {2}",
                        "there should be a {0} {1} at your {2}",
                        "there should be a {0} {1} to the {2}",
                        "there should be a {0} {1} to your {2}",
                        "there should be a {0} {1} to the {2} of you"
                    ],
                    withNestedAttribute: [
                        "you should be in front of a {0} with {1} {2}",
                        "there should be a {0} with {1} {2} at the {3}",
                        "there should be a {0} with {1} {2} at your {3}",
                        "there should be a {0} with {1} {2} to the {3}",
                        "there should be a {0} with {1} {2} to your {3}",
                        "there should be a {0} with {1} {2} to the {3} of you"
                    ]
                },
                withDirectionAndDistance: {
                    withoutAttribute: [
                        "you should be {0} steps away from a {1} on the {2}",
                        "you should be {0} steps away from a {1} on your {2}",
                        "you should be {0} steps away from a {1} to your {2}"
                    ],
                    withAttribute: [
                        "you should be {0} steps away from a {1} {2} on the {3}",
                        "you should be {0} steps away from a {1} {2} on your {3}",
                        "you should be {0} steps away from a {1} {2} to your {3}"
                    ],
                    withNestedAttribute: [
                        "you should be {0} steps away from a {1} with {2} {3} on the {4}",
                        "you should be {0} steps away from a {1} with {2} {3} on your {4}",
                        "you should be {0} steps away from a {1} with {2} {3} to your {4}"
                    ]
                }
            }
        };

        var sentences = [];
        var orientation = locations.absolute.north;
        for (var i = 0; i < paths.length - 1; i++) {

            var source = paths[i];
            var sourceLocation = locations.create(source.location.row, source.location.column);

            var destination = paths[i + 1];
            var destinationLocation = locations.create(destination.location.row, destination.location.column);

            var comparison = sourceLocation.compare(destinationLocation, orientation);
            orientation = comparison.absolute;

            var turnSentences;
            var turnSentence;
            var direction;

            if (source.turnSource.type === "unconditional") {
                if (!source.turnSource.useRelativeDirection) {
                    turnSentences = templates.turn.unconditional.filter(function (sentence) {
                        return !sentence.relationalOnly;
                    });
                } else {
                    turnSentences = templates.turn.unconditional;
                }

                turnSentence = turnSentences[Math.floor(Math.random() * turnSentences.length)];
                sentences.push(turnSentence.text.interpolate(source.turnSource.useRelativeDirection ? comparison.relative : comparison.absolute));

                if (turnSentence.fragment) {
                    sentences.push(", ");
                }
            } else {
                var turnReference = source.turnSource.reference;
                var attribute = turnReference.attribute === null ? "withoutAttribute" : typeof turnReference.attribute === "string" ? "withAttribute" : "withNestedAttribute";
                if (!source.turnSource.useRelativeDirection) {
                    turnSentences = templates.turn.conditional[attribute].filter(function (sentence) {
                        return !sentence.relationalOnly;
                    });
                } else {
                    turnSentences = templates.turn.conditional[attribute];
                }

                do {
                    turnSentence = turnSentences[Math.floor(Math.random() * turnSentences.length)];
                } while (/away/.test(turnSentence.text) && locations.relativeFromAbsolute[orientation][turnReference.direction] !== locations.relative.back);
                console.log("exit loop. template is:", turnSentence);

                direction = source.turnSource.useRelativeDirection ? locations.relativeFromAbsolute[orientation][turnReference.direction] : turnReference.direction;
                if (turnReference.attribute === null) {
                    sentences.push(turnSentence.text.interpolate(turnReference.name, direction));

                    if (/^[aeiou]/.test(turnReference.name)) {
                        sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                    }
                } else if (typeof turnReference.attribute === "string") {
                    sentences.push(turnSentence.text.interpolate(turnReference.attribute, turnReference.name, direction));

                    if (/^[aeiou]/.test(turnReference.attribute)) {
                        sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                    }
                } else {
                    sentences.push(turnSentence.text.interpolate(turnReference.name, turnReference.attribute.attribute, turnReference.attribute.name, direction));

                    if (/^[aeiou]/.test(turnReference.name)) {
                        sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                    }
                }
            }

            if (destination.moveDestination.type === "unconditional") {
                sentences.push(templates.move.unconditional[Math.floor(Math.random() * templates.move.unconditional.length)].interpolate(comparison.distance));

                if (comparison.distance === 1) {
                    sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/steps/, "step");
                }
            } else {
                var moveReference = destination.moveDestination.reference;
                var moveSentences;
                var moveSentence;

                if (typeof moveReference.direction === "undefined") {
                    if (moveReference.attribute === null) {
                        moveSentences = templates.move.conditional.withoutDirection.withoutAttribute;
                        sentences.push(moveSentences[Math.floor(Math.random() * moveSentences.length)].interpolate(moveReference.name));

                        if (/^[aeiou]/.test(moveReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else if (typeof moveReference.attribute === "string") {
                        moveSentences = templates.move.conditional.withoutDirection.withAttribute;
                        sentences.push(moveSentences[Math.floor(Math.random() * moveSentences.length)].interpolate(moveReference.attribute, moveReference.name));

                        if (/^[aeiou]/.test(moveReference.attribute)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else {
                        moveSentences = templates.move.conditional.withoutDirection.withNestedAttribute;
                        sentences.push(moveSentences[Math.floor(Math.random() * moveSentences.length)].interpolate(moveReference.name, moveReference.attribute.attribute, moveReference.attribute.name));

                        if (/^[aeiou]/.test(moveReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    }
                } else {
                    direction = destination.moveDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][moveReference.direction] : moveReference.direction;
                    if (moveReference.attribute === null) {
                        moveSentences = templates.move.conditional.withDirection.withoutAttribute;

                        do {
                            moveSentence = moveSentences[Math.floor(Math.random() * moveSentences.length)];
                        } while(/front/.test(moveSentence) && locations.relativeFromAbsolute[orientation][moveReference.direction] !== locations.relative.front);

                        sentences.push(moveSentence.interpolate(moveReference.name, direction));

                        if (/^[aeiou]/.test(moveReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else if (typeof moveReference.attribute === "string") {
                        moveSentences = templates.move.conditional.withDirection.withAttribute;

                        do {
                            moveSentence = moveSentences[Math.floor(Math.random() * moveSentences.length)];
                        } while(/front/.test(moveSentence) && locations.relativeFromAbsolute[orientation][moveReference.direction] !== locations.relative.front);

                        sentences.push(moveSentence.interpolate(moveReference.attribute, moveReference.name, direction));

                        if (/^[aeiou]/.test(moveReference.attribute)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else {
                        moveSentences = templates.move.conditional.withDirection.withNestedAttribute;

                        do {
                            moveSentence = moveSentences[Math.floor(Math.random() * moveSentences.length)];
                        } while(/front/.test(moveSentence) && locations.relativeFromAbsolute[orientation][moveReference.direction] !== locations.relative.front);

                        sentences.push(moveSentence.interpolate(moveReference.name, moveReference.attribute.attribute, moveReference.attribute.name, direction));

                        if (/^[aeiou]/.test(moveReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    }
                }
            }

            if (i === paths.length - 2) {
                var verifyReference = destination.verifyDestination.reference;
                var verifySentences;
                var verifySentence;

                if (typeof verifyReference.direction === "undefined" && typeof verifyReference.distance === "undefined") {
                    if (verifyReference.attribute === null) {
                        verifySentences = templates.verify.withoutDirectionAndDistance.withoutAttribute;
                        sentences.push(verifySentences[Math.floor(Math.random() * verifySentences.length)].interpolate(verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else if (typeof verifyReference.attribute === "string") {
                        verifySentences = templates.verify.withoutDirectionAndDistance.withAttribute;
                        sentences.push(verifySentences[Math.floor(Math.random() * verifySentences.length)].interpolate(verifyReference.attribute, verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.attribute)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else {
                        verifySentences = templates.verify.withoutDirectionAndDistance.withNestedAttribute;
                        sentences.push(verifySentences[Math.floor(Math.random() * verifySentences.length)].interpolate(verifyReference.name, verifyReference.attribute.attribute, verifyReference.attribute.name, direction, verifyReference.distance));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    }
                } else if (typeof verifyReference.direction !== "undefined" && typeof verifyReference.distance === "undefined") {
                    direction = destination.verifyDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][verifyReference.direction] : verifyReference.direction;
                    if (verifyReference.attribute === null) {
                        verifySentences = templates.verify.withDirection.withoutAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);

                        sentences.push(verifySentence.interpolate(verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else if (typeof verifyReference.attribute === "string") {
                        verifySentences = templates.verify.withDirection.withAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);

                        sentences.push(verifySentence.interpolate(verifyReference.attribute, verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.attribute)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else {
                        verifySentences = templates.verify.withDirection.withNestedAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);

                        sentences.push(verifySentence.interpolate(verifyReference.name, verifyReference.attribute.attribute, verifyReference.attribute.name, direction));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    }
                } else if (typeof verifyReference.direction !== "undefined" && typeof verifyReference.distance !== "undefined") {
                    direction = destination.verifyDestination.useRelativeDirection ? locations.relativeFromAbsolute[orientation][verifyReference.direction] : verifyReference.direction;
                    if (verifyReference.attribute === null) {
                        verifySentences = templates.verify.withDirectionAndDistance.withoutAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);

                        sentences.push(verifySentence.interpolate(verifyReference.distance, verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else if (typeof verifyReference.attribute === "string") {
                        verifySentences = templates.verify.withDirectionAndDistance.withAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);

                        sentences.push(verifySentence.interpolate(verifyReference.distance, verifyReference.attribute, verifyReference.name, direction));

                        if (/^[aeiou]/.test(verifyReference.attribute)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    } else {
                        verifySentences = templates.verify.withDirectionAndDistance.withNestedAttribute;

                        do {
                            verifySentence = verifySentences[Math.floor(Math.random() * verifySentences.length)];
                        } while(/front/.test(verifySentence) && locations.relativeFromAbsolute[orientation][verifyReference.direction] !== locations.relative.front);


                        sentences.push(verifySentence.interpolate(verifyReference.distance, verifyReference.name, verifyReference.attribute.attribute, verifyReference.attribute.name, direction));

                        if (/^[aeiou]/.test(verifyReference.name)) {
                            sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/ a /, " an ");
                        }
                    }

                    if (verifyReference.distance === 1) {
                        sentences[sentences.length - 1] = sentences[sentences.length - 1].replace(/steps/, "step");
                    }
                }
            }
        }

        return sentences;
    }

    function generatePath() {
        function findNextLocation(scanData, lastDirection) {
            var candidateTurnPoints = Object.keys(scanData.lineOfSight).reduce(function (candidateTurnPoints, direction) {
                if (scanData.lineOfSight[direction].turnPoints.length > 0 &&
                    (lastDirection === null ||
                    (lastDirection !== locations.oppositeAbsolute[direction] && lastDirection !== direction))) {
                    candidateTurnPoints[direction] = scanData.lineOfSight[direction].turnPoints;
                }

                return candidateTurnPoints;
            }, {});

            var randomDirection = Object.keys(candidateTurnPoints)[Math.floor(Math.random() * Object.keys(candidateTurnPoints).length)];
            return candidateTurnPoints[randomDirection][Math.floor(Math.random() * candidateTurnPoints[randomDirection].length)].location;
        }

        function findDestination(scanData, location, direction) {
            var objects = scanData.lineOfSight[direction].objects.filter(function (object) {
                return object.name !== "wall";
            });

            var object = objects[Math.floor(Math.random() * objects.length)];
            if (location.row === object.position.row) {
                if (location.compare(locations.create(object.position.row, object.position.column)).absolute === locations.absolute.east) {
                    return locations.create(object.position.row, object.position.column - 1);
                } else {
                    return locations.create(object.position.row, object.position.column + 1);
                }
            } else if (location.column === object.position.column) {
                if (location.compare(locations.create(object.position.row, object.position.column)).absolute === locations.absolute.north) {
                    return locations.create(object.position.row + 1, object.position.column);
                } else {
                    return locations.create(object.position.row - 1, object.position.column);
                }
            } else {
                var row = Math.abs(location.row - object.position.row) == 1 ? location.row : object.position.row;
                var column = Math.abs(location.column - object.position.column) <= 1 ? location.column : object.position.column;

                return locations.create(row, column);
            }
        }

        function generateMoveReference(scanData) {
            var useDirection = Math.floor(Math.random() * 2) === 1;
            var object = null;
            do {
                var random = scanData.immediate.objects[Math.floor(Math.random() * scanData.immediate.objects.length)];
                object = {
                    name: random.name,
                    attribute: random.attribute
                };

                if (useDirection || object.name === "hallway") {
                    object.direction = random.position.absolute;
                }
            } while (object.name === "wall");

            return object;
        }

        function generateTurnReference(scanData) {
            var object = scanData.immediate.objects[Math.floor(Math.random() * scanData.immediate.objects.length)];
            return {
                name: object.name,
                attribute: object.attribute,
                direction: object.position.absolute
            };
        }

        function generateVerifyReference(currentLocation, currentOrientation, scanData) {
            //Ignore objects that are directly northwest, northeast, southwest or southwest as the relative and absolute
            //directions can be ambiguous. Since compare gives the straight-line distance, this means we can ignore
            //anything that is of distance 2. Our maximum distance is going to be 4.
            var references = scanData.immediate.objects.filter(function (object) {
                return object.name !== "wall";
            }).map(function (object) {
                if (Math.floor(Math.random() * 3) === 2) {
                    return {
                        name: object.name,
                        attribute: object.attribute
                    };
                } else if (Math.floor(Math.random() * 3) === 2) {
                    return {
                        name: object.name,
                        attribute: object.attribute,
                        direction: object.position.value
                    };
                } else {
                    return {
                        name: object.name,
                        attribute: object.attribute,
                        direction: object.position.absolute,
                        distance: 1
                    };
                }
            }).concat(Object.keys(scanData.lineOfSight).filter(function (direction) {
                return locations.oppositeAbsolute[direction] !== currentOrientation;
            }).reduce(function (references, direction) {
                return scanData.lineOfSight[direction].objects.filter(function (object) {
                    var distance = currentLocation.compare(locations.create(object.position.row, object.position.column)).distance;
                    return (distance <= 5 && distance !== 2) && object.name !== "wall";
                }).reduce(function (references, object) {
                    var rows = Math.abs(currentLocation.row - object.position.row);
                    var columns = Math.abs(currentLocation.column - object.position.column);
                    var distance = (rows > columns) ? rows : columns;
                    if (rows === 0 || columns === 0) {
                        distance--;
                    }

                    references.push({
                        name: object.name,
                        attribute: object.attribute,
                        direction: direction,
                        distance: distance
                    });

                    return references;
                }, references);
            }, []));

            return references[Math.floor(Math.random() * references.length)];
        }

        var paths = [];
        var currentOrientation = locations.absolute.north;
        var lastOrientation = null;
        var lastDirection = null;
        var size = Math.floor(Math.random() * 4) + 3;
        var done = false;
        var i = 0;
        while (i < size - 1 && !done) {
            var coordinate = {};

            var isFirst = (i === 0);
            var isLast = (i === (size - 2));
            var randomLocation = isFirst ? world.startingPoints[Math.floor(Math.random() * world.startingPoints.length)] : null;
            var previousLocation = isFirst ? null : paths[i - 1].location;
            var scanLocation = isFirst ? randomLocation : previousLocation;

            start(scanLocation.row, scanLocation.column);
            var scanData = scan();

            coordinate.location = isFirst ? randomLocation : findNextLocation(scanData, lastDirection);
            if (i >= 2) {
                while (coordinate.location.compare(paths[i - 2].location).coincident || coordinate.location.compare(previousLocation).coincident) {
                    coordinate.location = findNextLocation(scanData, lastDirection);
                }
            } else if (i === 1) {
                while (coordinate.location.compare(previousLocation).coincident) {
                    coordinate.location = findNextLocation(scanData, lastDirection);
                }
            }

            if (!isFirst) {
                lastOrientation = currentOrientation;
                currentOrientation = previousLocation.compare(coordinate.location).absolute;
                if (currentOrientation === lastOrientation || locations.oppositeAbsolute[currentOrientation] === lastOrientation) {
                    paths[i - 1].turnSource.useRelativeDirection = false;
                }

                turn(currentOrientation);
                start(coordinate.location.row, coordinate.location.column);
                scanData = scan();

                coordinate.moveDestination = {
                    type: Math.floor(Math.random() * 2) === 1 ? "conditional" : "unconditional",
                    useRelativeDirection: Math.floor(Math.random() * 2) === 1
                };

                if (coordinate.moveDestination.type === "conditional") {
                    coordinate.moveDestination.reference = generateMoveReference(scanData)
                }
            }

            var type = Math.floor(Math.random() * 2) === 1 ? "conditional" : "unconditional";
            coordinate.turnSource = {
                type: type,
                useRelativeDirection: type === "conditional" ? true : Math.floor(Math.random() * 2) === 1
            };

            if (coordinate.turnSource.type === "conditional") {
                coordinate.turnSource.reference = generateTurnReference(scanData);
            }


            paths.push(coordinate);

            if (!isFirst) {
                lastDirection = currentOrientation;
            }

            if (isLast) {
                var lastLocation = coordinate.location;
                var turnPoint = findNextLocation(scanData, lastDirection);
                var direction = coordinate.location.compare(locations.create(turnPoint.row, turnPoint.column)).absolute;
                turn(direction);

                coordinate = {};
                coordinate.location = findDestination(scanData, lastLocation, direction);
                start(coordinate.location.row, coordinate.location.column);

                scanData = scan();

                coordinate.moveDestination = {
                    type: Math.floor(Math.random() * 2) === 1 ? "conditional" : "unconditional",
                    useRelativeDirection: Math.floor(Math.random() * 2) === 1
                };

                if (coordinate.moveDestination.type === "conditional") {
                    coordinate.moveDestination.reference = generateMoveReference(scanData)
                }

                coordinate.verifyDestination = {
                    useRelativeDirection: Math.floor(Math.random() * 2) === 1,
                    reference: generateVerifyReference(coordinate.location, direction, scanData)
                };

                paths.push(coordinate);
            }

            i++;
        }

        return paths;
    }

    function start(row, column) {
        if (row < 0 || row > 14 || column < 0 || column > 14) {
            throw new RangeError("Illegal coordinates: (", row + ",", column + ")");
        } else if (world.isBlocked(locations.create(row, column))) {
            console.warn("That location is not empty");
        } else {
            _location = locations.create(row, column);

            var rect = world.objectAt(_location).cell.getBoundingClientRect();
            dalek.style.top = rect.top + "px";
            dalek.style.left = rect.left + "px";
        }

        return this;
    }

    function turn(direction) {
        var originalOrientation = _orientation;
        if (locations.absolute[direction]) {
            _orientation = direction;
        } else {
            _orientation = locations.absoluteFromRelative[_orientation][direction];
        }

        var rotation = parseInt(dalek.style.transform.replace(/[a-z()]/g, ""), 10);
        if (direction === locations.relative.left) {
            rotation -= 90;
        } else if (direction === locations.relative.right) {
            rotation += 90;
        } else if (direction === locations.absolute.north) {
            rotation = 0;
        } else if (direction === locations.absolute.south) {
            rotation = 180;
        } else if (direction === locations.absolute.east) {
            rotation = 90;
        } else if (direction === locations.absolute.west) {
            rotation = 270;
        }

        dalek.style.transform = "rotate" + "(" + rotation + "deg)";
        return this;
    }

    function move(distance) {
        distance = distance || 1;
        for (var i = 0; i < distance; i++) {
            if (!world.isBlocked(_location[_orientation]())) {
                _location = _location[_orientation]();

                var rect = world.objectAt(_location).cell.getBoundingClientRect();
                dalek.style.top = rect.top + "px";
                dalek.style.left = rect.left + "px";
            } else {
                throw new RangeError("Robot crashed into the wall :(");
            }
        }

        return this;
    }

    return {
        start: start,
        turn: turn,
        move: move,
        orientation: function () {
            return _orientation;
        },
        location: function () {
            return _location;
        },
        scan: scan,
        render: function () {
            if (dalek == null) {
                dalek = document.createElement("div");

                dalek.id = "dalek";
                dalek.style.backgroundImage = "url(images/dalek.png)";
                dalek.style.height = "75px";
                dalek.style.width = "75px";
                dalek.style.backgroundSize = "100%";
                dalek.style.position = "absolute";
                dalek.style.zIndex = 2;
                dalek.style.transform = "rotate(0deg)";
                dalek.style.transition = "top 1s, left 1s, transform 2s";

                var rect = world.objectAt(_location).cell.getBoundingClientRect();
                dalek.style.top = rect.top + "px";
                dalek.style.left = rect.left + "px";
                dalek.style.height = rect.height + "px";
                dalek.style.width = rect.width + "px";

                document.body.appendChild(dalek);
            }
        },
        parse: parser.parse,
        generatePath: generatePath,
        generate: function () {
            var path = generatePath();
            console.log(generateFormal(path));
            console.log(generateEnglish(path));
        }
    };

})(world);

var simulation = (function () {
    function scanAndCheck(until) {
        var i;
        var flag = false;
        var scan = robot.scan();
        until.forEach(function (condition) {
            var direction = null;
            var distance = null;
            if (typeof condition.orientation != 'undefined') {
                direction = condition.orientation.direction;
                if (typeof(condition.orientation.distance) != 'undefined') {
                    distance = parseInt(condition.orientation.distance.magnitude) + 1;
                }
            }
            if (distance == null) {
                for (i = 0; i < scan.immediate.objects.length; i++) {
                    var object = scan.immediate.objects[i];
                    if (object.name === condition.object.name) {
                        if (typeof (object.attribute) === 'string') {
                            if ((typeof( condition.object.attributes) == 'undefined') ||
                                ( typeof( condition.object.attributes[0]) != 'undefined' && condition.object.attributes[0] === object.attribute)) {
                                if (direction != null)
                                    if (direction !== object.position.relative)
                                        continue;
                                flag = true;
                                break;
                            }
                        }
                        else {
                            if (typeof( condition.object.attributes) == 'undefined' || (typeof(condition.object.attributes[0]) != 'undefined' &&
                                condition.object.attributes[0].name === object.attribute.name && condition.object.attributes[0].attributes[0] == object.attribute.attribute)) {
                                if (direction != null)
                                    if (direction !== object.position.relative)
                                        continue;
                                flag = true;
                                break;
                            }
                        }
                    }
                }
            }
            else if (direction != null && distance != null) {
                for (i = 0; i < scan.lineOfSight[robot.orientation()].objects.length; i++) {
                    object = scan.lineOfSight[robot.orientation()].objects[i];
                    var currentPosition = locations.create(object.position.row, object.position.column);
                    if (distance == currentPosition.compare(robot.location()).distance) {
                        if (object.position.relative === direction &&
                            object.name === condition.object.name) {
                            if (typeof (object.attribute) === 'string') {
                                if ((typeof( condition.object.attributes) == 'undefined') ||
                                    ( typeof( condition.object.attributes[0]) != 'undefined' && condition.object.attributes[0] === object.attribute)) {
                                    flag = true;
                                    break;
                                }
                            }
                            else {
                                if (typeof( condition.object.attributes) == 'undefined' || (typeof(condition.object.attributes[0]) != 'undefined' &&
                                    condition.object.attributes[0].name === object.attribute.name && condition.object.attributes[0].attributes[0] == object.attribute.attribute)) {
                                    flag = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });

        return flag;
    }

    function simulate(sentence) {
        if (sentence.length != 0) {
            var object = parser.parse(sentence).forEach(function (element) {
                var scan;
                var action = element.instruction;
                //alert(action)
                if (action === 'start')
                    robot.start(element.arguments.row, element.arguments.column);
                if (action === 'turn') {
                    if (element.arguments.direction != null)
                        robot.turn(element.arguments.direction);
                    else if (element.arguments.until != null) {
                        var numberOfTurns = 0;
                        do {
                            if (scanAndCheck(element.arguments.until)) break;
                            else robot.turn('left');
                            numberOfTurns += 1
                        } while (numberOfTurns < 4)
                    }
                }
                if (action === 'move') {
                    scan = robot.scan();
                    if (scan.immediate.paths.indexOf(scan.orientation) >= 0) {
                        if (element.arguments.distance != null) {
                            robot.move(element.arguments.distance.magnitude);
                        }
                        else
                            do {
                                robot.move();
                                if (scanAndCheck(element.arguments.until)) break;
                            } while (true)
                    }
                }
                if (action === 'verify') {
                    scan = robot.scan();
                    if (element.arguments.that != null) {
                        if (!scanAndCheck(element.arguments.that))
                            throw new Error('Location not matched');
                    }
                }
            });
        }
    }

    return {
        simulate: simulate
    }
})();

var simulator = (function() {

    var handlers = {
        start: start,
        turn: turn,
        move: move,
        verify: verify
    };

    function start(args) {
        robot.start(args.row, args.column);
    }

    function turn(args) {
        if(typeof args.direction !== "undefined") {
            robot.turn(args.direction);
        } else {
            args.until.reduce(function(result, condition) {
                var satisfied = false;
                var i = 0;
                while(i < 4 && !satisfied) {
                    satisfied = robot.turn(locations.relative.right)
                        .scan()
                        .immediate
                        .objects
                        .reduce(function(matched, object) {
                            var match = object.name === condition.object.name;

                            var hasAttibute = typeof condition.object.attributes !== "undefined";
                            if(hasAttibute && typeof condition.object.attributes[0] === "string") {
                                match = match && (typeof object.attribute === "string") && (object.attribute === condition.object.attributes[0]);
                            } else if(hasAttibute && typeof condition.object.attributes[0] === "object") {
                                match = match && (typeof object.attribute === "object") && (object.attribute.name === condition.object.attributes[0].name) && (object.attribute.attribute === condition.object.attributes[0].attributes[0]);
                            }

                            match = match && (object.position.relative === condition.orientation.direction);

                            return matched || match;
                    }, false);

                    i++;
                }

                return satisfied && result;
            }, true);
        }
    }

    function move() {

    }

    function verify() {

    }

    function simulate(program) {
        var instructions = parser.parse(program);
        instructions.forEach(function(instruction) {
            handlers[instruction.instruction].call(null, instruction.arguments);
        });
    }

    return {
        simulate: simulate
    };

})();

window.onload = function () {
    world.render();
    robot.render();
    //simulation.simulate(sentence)
};

window.onresize = function () {
    world.render();
    robot.render();
};