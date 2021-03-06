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
            row: parseInt(row, 10),
            column: parseInt(column, 10),
            north: function () {
                return create(this.row - 1 < 0 ? 0 : this.row - 1, this.column);
            },
            south: function () {
                return create(this.row + 1 > 14 ? 14 : this.row + 1, this.column);
            },
            east: function () {
                return create(this.row, this.column + 1 > 14 ? 14 : this.column + 1);
            },
            west: function () {
                return create(this.row, this.column - 1 < 0 ? 0 : this.column - 1);
            },
            isNorth: function (other) {
                return this.row < other.row;
            },
            isSouth: function (other) {
                return this.row > other.row;
            },
            isEast: function (other) {
                return this.column > other.column;
            },
            isWest: function (other) {
                return this.column < other.column;
            },
            clone: function () {
                return create(this.row, this.column);
            },
            compare: function (other, orientation) {
                orientation = orientation || absolute.north;
                var distance = Math.abs(other.row - this.row) + Math.abs(other.column - this.column);

                if (other.row > this.row) {
                    return {
                        absolute: absolute.south,
                        relative: relativeFromAbsolute[orientation][absolute.south],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.row < this.row) {
                    return {
                        absolute: absolute.north,
                        relative: relativeFromAbsolute[orientation][absolute.north],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.column > this.column) {
                    return {
                        absolute: absolute.east,
                        relative: relativeFromAbsolute[orientation][absolute.east],
                        distance: distance,
                        coincident: false
                    };
                } else if (other.column < this.column) {
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
                return "(" + this.row + ", " + this.column + ")";
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
                row: parseInt(check.data, 10),
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

        result.data.arguments.column = parseInt(check.data, 10);

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
                magnitude: parseInt(check.data, 10)
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
        table.innerHTML = "";

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
                    //sentences.push(", ");
                }
            } else {
                var turnReference = source.turnSource.reference;
                var attribute = !turnReference.attribute ? "withoutAttribute" : typeof turnReference.attribute === "string" ? "withAttribute" : "withNestedAttribute";
                if (!source.turnSource.useRelativeDirection && locations.relativeFromAbsolute[orientation][turnReference.direction] !== locations.relative.back) {
                    turnSentences = templates.turn.conditional[attribute].filter(function (sentence) {
                        return !sentence.relationalOnly;
                    });
                } else {
                    turnSentences = templates.turn.conditional[attribute];
                }

                turnSentence = turnSentences[Math.floor(Math.random() * turnSentences.length)];

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
                do {
                    coordinate.location = findDestination(scanData, lastLocation, direction);
                } while(coordinate.location.compare(lastLocation).coincident);
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
                dalek.style.backgroundSize = "100%";
                dalek.style.position = "absolute";
                dalek.style.zIndex = 2;
                dalek.style.transform = "rotate(0deg)";
                dalek.style.transition = "top 1s, left 1s, transform 2s";

                document.body.appendChild(dalek);
            }

            var rect = world.objectAt(_location).cell.getBoundingClientRect();
            dalek.style.top = rect.top + "px";
            dalek.style.left = rect.left + "px";
            dalek.style.height = rect.height + "px";
            dalek.style.width = rect.width + "px";
        },
        parse: parser.parse,
        generate: function () {
            var path = generatePath();
            return {
                formal: generateFormal(path),
                english: generateEnglish(path)
            };
        }
    };

})(world);

var simulator = (function() {

    var handlers = {
        start: start,
        turn: turn,
        move: move,
        verify: verify
    };

    function match(condition, object, checkDirection) {
        var match = object.name === condition.object.name;

        var hasAttribute = typeof condition.object.attributes !== "undefined";
        if(hasAttribute && typeof condition.object.attributes[0] === "string") {
            match = match && (typeof object.attribute === "string") && (object.attribute === condition.object.attributes[0]);
        } else if(hasAttribute && typeof condition.object.attributes[0] === "object") {
            match = match && (typeof object.attribute === "object") && (object.attribute.name === condition.object.attributes[0].name) && (object.attribute.attribute === condition.object.attributes[0].attributes[0]);
        }

        if(checkDirection) {
            match = match && (locations.absolute[condition.orientation.direction] ? (object.position.absolute === condition.orientation.direction) : (object.position.relative === condition.orientation.direction));
        }

        return match;
    }

    function start(args) {
        robot.start(args.row, args.column);
        return {
            instruction: "start",
            successful: true
        };
    }

    function turn(args) {
        var successful = true;
        if(typeof args.direction !== "undefined") {
            robot.turn(args.direction);
        } else {
            successful = args.until.reduce(function(result, condition) {
                var satisfied = false;
                var i = 0;
                while(i < 4 && !satisfied) {
                    satisfied = robot.turn(locations.relative.right)
                        .scan()
                        .immediate
                        .objects
                        .reduce(function(matched, object) {
                            return matched || match(condition, object, true);
                        }, false);

                    i++;
                }

                if(!satisfied) {
                    console.error("I'm getting dizzy!")
                }

                return satisfied && result;
            }, true);
        }

        return {
            instruction: "turn",
            successful: successful
        };
    }

    function move(args) {
        var successful = true;
        if(typeof args.distance !== "undefined") {
            robot.move(args.distance.magnitude);
        } else {
            successful = args.until.reduce(function(result, condition) {
                var satisfied = false;
                var crashed = false;
                while(!crashed && !satisfied) {
                    try {
                        satisfied = robot.move()
                            .scan()
                            .immediate
                            .objects
                            .reduce(function (matched, object) {
                                return matched || match(condition, object, typeof condition.orientation !== "undefined");
                            }, false);
                    } catch(e) {
                        crashed = true;
                        console.error("Instructions unclear. I crashed into the wall.");
                    }
                }

                return satisfied && !crashed && result;
            }, true);
        }

        return {
            instruction: "move",
            successful: successful
        };
    }

    function verify(args) {
        var verified = args.that.reduce(function(result, condition) {
            var satisfied = false;
            var direction;

            var scanData = robot.scan();
            var immediate = scanData.immediate;
            var lineOfSight = scanData.lineOfSight;
            immediate.objects.forEach(function(object) {
                lineOfSight[object.position.absolute].objects.push(object);
            });

            if(typeof condition.orientation === "undefined") {
                satisfied = Object.keys(lineOfSight).reduce(function(objects, key) {
                    return objects.concat(lineOfSight[key].objects);
                }, []).reduce(function (matched, object) {
                    var match = object.name === condition.object.name;

                    var hasAttribute = typeof condition.object.attributes !== "undefined";
                    if(hasAttribute && typeof condition.object.attributes[0] === "string") {
                        match = match && (typeof object.attribute === "string") && (object.attribute === condition.object.attributes[0]);
                    } else if(hasAttribute && typeof condition.object.attributes[0] === "object") {
                        match = match && (typeof object.attribute === "object") && (object.attribute.name === condition.object.attributes[0].name) && (object.attribute.attribute === condition.object.attributes[0].attributes[0]);
                    }

                    return matched || match;
                }, false);
            } else if(typeof condition.orientation.direction !== "undefined") {
                direction = (typeof locations.absolute[condition.orientation.direction] === "undefined") ? locations.absoluteFromRelative[robot.orientation()][condition.orientation.direction] : condition.orientation.direction;

                var objects = Object.keys(lineOfSight).reduce(function (objects, key) {
                    return lineOfSight[key].objects.reduce(function (objects, object) {
                        var directionCheckFunctionName = "is" + direction.substr(0, 1).toUpperCase() + direction.substr(1);
                        var objectLocation = locations.create(object.position.row, object.position.column);
                        if (objectLocation[directionCheckFunctionName](robot.location())) {
                            objects.push(object);
                        }

                        return objects;
                    }, objects);
                }, []);

                console.log("objects is", objects);

                if (typeof condition.orientation.distance === "undefined") {
                    satisfied = objects.reduce(function (matched, object) {
                        var match = object.name === condition.object.name;

                        var hasAttribute = typeof condition.object.attributes !== "undefined";
                        if(hasAttribute && typeof condition.object.attributes[0] === "string") {
                            match = match && (typeof object.attribute === "string") && (object.attribute === condition.object.attributes[0]);
                        } else if(hasAttribute && typeof condition.object.attributes[0] === "object") {
                            match = match && (typeof object.attribute === "object") && (object.attribute.name === condition.object.attributes[0].name) && (object.attribute.attribute === condition.object.attributes[0].attributes[0]);
                        }

                        return matched || match;
                    }, false);
                } else {
                    satisfied = objects.filter(function (object) {
                        var distance = robot.location().compare(locations.create(object.position.row, object.position.column)).distance;
                        if (robot.location().row !== object.position.row && robot.location().column !== object.position.column) {
                            distance--;
                        }

                        return (distance === parseInt(condition.orientation.distance.magnitude, 10));
                    }).reduce(function (matched, object) {
                        var match = object.name === condition.object.name;

                        var hasAttribute = typeof condition.object.attributes !== "undefined";
                        if(hasAttribute && typeof condition.object.attributes[0] === "string") {
                            match = match && (typeof object.attribute === "string") && (object.attribute === condition.object.attributes[0]);
                        } else if(hasAttribute && typeof condition.object.attributes[0] === "object") {
                            match = match && (typeof object.attribute === "object") && (object.attribute.name === condition.object.attributes[0].name) && (object.attribute.attribute === condition.object.attributes[0].attributes[0]);
                        }

                        return matched || match;
                    }, false);
                }
            }

            return satisfied && result;
        }, true);

        return {
            instruction: "verify",
            successful: verified
        };
    }

    function simulate(program) {
        var instructions = parser.parse(program);
        return instructions.reduce(function(result, instruction) {
            return result && handlers[instruction.instruction].call(null, instruction.arguments);
        }, true);
    }

    return {
        simulate: simulate
    };

})();

var toggle = true;

window.onload = function () {
    world.render();
    robot.render();
    robot.start(13, 8);

    document.addEventListener("keypress", function(event) {
        if(String.fromCharCode(event.keyCode).toLowerCase() === "t" && toggle) {
            toggleNatural();
        }
    });

    document.getElementById("translate").addEventListener("click", translate);
    document.getElementById("generate").addEventListener("click", generate);
    document.getElementById("cancel").addEventListener("click", function() {
        toggle = true;
        toggleNatural();
    });

    require('nw.gui').Window.get().showDevTools();
};

function generate() {
    toggle = true;
    toggleNatural();

    var generated = robot.generate();
    notify("info", '<div class="monospaced">' + generated.formal.join('<br />') + '</div><br />' + '<div class="non-monospaced">' + generated.english.join('. ') + '</div>', null, 6000);

    simulate(generated.formal);
}

function simulate(formal) {
    var transitionEnded = false;
    document.getElementById("dalek").removeEventListener("transitionend", setTransitionEnded);
    document.getElementById("dalek").addEventListener("transitionend", setTransitionEnded);

    function setTransitionEnded() {
        transitionEnded = true;
    }

    (function run(i) {
        notify("info", '<div class="monospaced">' + formal[i] + '</div>', null, 2000);
        setTimeout(function() {
            transitionEnded = false;

            var result = simulator.simulate(formal[i]);
            var transitionTimeout = setTimeout(function() {
                transitionEnded = true;
            }, 2500);

            transitionEnded = transitionEnded || !result.successful;

            var interval = setInterval(function() {
                if(transitionEnded) {
                    clearTimeout(transitionTimeout);
                    clearInterval(interval);

                    i++;
                    if(!result.successful && result.instruction !== "verify") {
                        notify("error", '<div class="monospaced" style="display: inline-block">' + result.instruction + '</div> instruction failed. Complete instruction was:<br /><div class="monospaced">' + formal[i - 1] + '</div>', null, 6000);
                    } else if(!result.successful && result.instruction === "verify") {
                        notify("error", 'Verification failed! We are not at the correct destination! Complete instruction was:<br /><div class="monospaced">' + formal[i - 1] + '</div>', null, 4000);
                    } else if(result.successful && result.instruction === "verify") {
                        notify("info", "Verification successful! We are at the correct destination!", null, 4000);
                    } else if(i < formal.length) {
                        run(i);
                    }
                }
            }, 100);
        }, 2250)
    })(0);
}

function translate() {
    toggle = true;
    toggleNatural();
    var instructions = document.getElementById("instructions").value.split(/ and |\. |, |\n/);



    var fs = require('fs');
    fs.writeFile("./resources/nl2kr/test.txt", instructions.map(function(s) { return s.trim(); }).join("\n"));

    var translations = [];
    var spawn = require('child_process').spawn;
    var translator = spawn("./NL2KR-T.sh", ["nlp-navigation-config"]);
    translator.stdout.on("data", function(data) {
        var stdout = data.toString("utf8");
        stdout.replace(/\n$/, "").split("\n").forEach(function(line) {
            console.log(line);

            if(/Parsing sentence \d+/.test(line)) {
                translations.push([]);
                i++;

                showDialogMessage("Translating sentence #" + (i + 1) + ": \"" + line.replace(/^.*: /, "") + "\"...");
            } else if(/Predicted result #\d+/.test(line)) {
                translations[i].push(line.replace(/^.*: /, ""));
                showDialogMessage('Adding predicted result #' + translations[i].length + ' for sentence #' + (i + 1) + ':<br /><div class="monospaced" style="display: inline-block">' + line.replace(/^.*: /, "") + '</div>');
            }
        });
    });

    var i = -1;
    translator.stderr.on("data", function(data) {
        var line = data.toString("utf8");
        console.log(line);
    });

    translator.on("close", function(code) {
        closeDialog();

        var invalidTranslations = {};
        var formal = [];
        var j = 0;
        var error = translations.reduce(function(error, predictions) {
            var found = false;
            var i = 0;
            while(i < predictions.length && !found) {
                try {
                    parser.parse(predictions[i]);
                    found = true;
                    formal.push(predictions[i]);
                } catch(e) {
                    console.log(predictions[i], " is not a valid prediction for sentence #" + j);
                }

                i++;
            }

            if(!found) {
                invalidTranslations[j] = true;
            }

            j++;
            return !found || error;
        }, false);

        if(error) {
            notify(
                "error", "Unable to run simulation, because the following sentences didn't have valid translations:<br /><br />" + Object.keys(invalidTranslations).map(function(i) {
                    return instructions[i];
                }).join("<br />"),
                null,
                6000
            );
        } else {
            simulate(formal);
        }
    });
}

function notify(type, message, monospaced, time) {
    var vWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    var status = document.getElementById("status");
    status.innerHTML = message;

    if(type === "info") {
        status.className = "interface info";
    } else if(type === "error") {
        status.className = "interface error";
    }

    if(monospaced) {
        status.className += " monospaced";
    } else {
        status.className += " non-monospaced";
    }

    status.style.opacity = 1;
    var rect = status.getBoundingClientRect();
    status.style.top = ((vHeight - rect.height) / 2) + "px";
    status.style.left = ((vWidth - rect.width) / 2) + "px";
    status.style.zIndex = 5;

    setTimeout(function() {
        status.style.opacity = 0;
        status.style.zIndex = -1;
    }, time || 3000);
}

function showDialogMessage(message) {
    var vWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    var status = document.getElementById("status");
    status.innerHTML = message;

    var rect = status.getBoundingClientRect();

    status.className = "interface info";

    status.style.opacity = 1;
    status.style.top = ((vHeight - rect.height) / 2) + "px";
    status.style.left = ((vWidth - rect.width) / 2) + "px";
    status.style.zIndex = 5;
}

function closeDialog() {
    var status = document.getElementById("status");

    status.style.opacity = 0;
    status.style.zIndex = -1;
}

function toggleNatural() {
    var vWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    var natural = document.getElementById("natural");
    if(natural.style.opacity == 0) {
        natural.style.opacity = 1;
        natural.style.zIndex = 3;

        var rect = natural.getBoundingClientRect();
        natural.style.top = ((vHeight - rect.height) / 2) + "px";
        natural.style.left = ((vWidth - rect.width) / 2) + "px";

        toggle = false;
    } else {
        natural.style.opacity = 0;
        natural.style.zIndex = -1;
    }
}

window.onresize = function () {
    world.render();
    robot.render();

    var vWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    var natural = document.getElementById("natural");
    var rect = natural.getBoundingClientRect();
    natural.style.top = ((vHeight - rect.height) / 2) + "px";
    natural.style.left = ((vWidth - rect.width) / 2) + "px";
};
