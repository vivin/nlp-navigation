var locations = (function() {
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
        behind: "behind"
    };

    var absoluteFromRelative = {
        north: {
            left: absolute.west,
            right: absolute.east,
            front: absolute.north,
            behind: absolute.south
        },
        south: {
            left: absolute.east,
            right: absolute.west,
            front: absolute.south,
            behind: absolute.north
        },
        east: {
            left: absolute.north,
            right: absolute.south,
            front: absolute.east,
            behind: absolute.west
        },
        west: {
            left: absolute.south,
            right: absolute.north,
            front: absolute.west,
            behind: absolute.east
        }
    };

    var relativeFromAbsolute = {
        north: {
            north: relative.front,
            south: relative.behind,
            east: relative.right,
            west: relative.left
        },
        south: {
            north: relative.behind,
            south: relative.front,
            east: relative.left,
            west: relative.right
        },
        east: {
            north: relative.left,
            south: relative.right,
            east: relative.front,
            west: relative.behind
        },
        west: {
            north: relative.right,
            south: relative.left,
            east: relative.behind,
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
        front: relative.behind,
        behind: relative.front
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
                var orientation = orientation || absolute.north;
                var distance = Math.abs((other.row - row) + (other.column - column));
                if(other.row > row) {
                    return {
                        absolute: absolute.south,
                        relative:  relativeFromAbsolute[orientation][absolute.south],
                        distance: distance,
                        coincident: false
                    };
                } else if(other.row < row) {
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

        if(!result.successful) {
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

        if(!result.successful) {
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
        "W3P2W3W3w0W3W3w1W3W3w2W3W3P3W1" +
        "PP                          LL" +
        "W3  W4W4W4W4W4W4W4W4W4W4W4  W1" +
        "W3  W4XXXXXXXXPP  ~1~1~1~1  W1" +
        "W3  W4XXXXXXXXW4  W2W2W2W2  W1" +
        "W3  W4LLW4XXXXD5  ~0~0~0~0  W1" +
        "W3      W4XXXXW4  W0W0W0W0  W1" +
        "W3W3W3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXW3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXP0  W4XXXXD3  W0XXXXD4  P1" +
        "XXXXW3  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXD2  W4XXXXW4  W0XXXXW0  W1" +
        "XXXXW3  W4W4D1W4  W0W0W0W0  W1" +
        "XXXXW3                      W1" +
        "XXXXW3W1W1W1W1W1D0W1W1W1W1W1W1";

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
            attributes: ["old", "abstract", "classic", "modern"]
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

String.prototype.interpolate = function() {
    var values = arguments;
    return this.replace(/\{([0-9])\}/g, function($0, $1) {
        return values[$1];
    });
};

var robot = (function (world) {
    var dalek = null;

    var location = world.startingPoints[Math.floor(Math.random() * world.startingPoints.length)];
    var orientation = locations.absolute.north;

    function scan() {
        var sensorData = {
            orientation: orientation,
            immediate: immediateScan(location),
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
            var currentLocation = location[absoluteDirection]();
            while (!world.isBlocked(currentLocation)) {
                var scanData = immediateScan(currentLocation);
                var turnPointPaths = scanData.paths.filter(function(path) {
                    return absoluteDirection !== path && absoluteDirection !== locations.oppositeAbsolute[path];
                });

                sensorData.lineOfSight[absoluteDirection].objects = sensorData.lineOfSight[absoluteDirection].objects.concat(scanData.objects);
                if(turnPointPaths.length > 0) {
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
                            relative: locations.relativeFromAbsolute[orientation][absoluteDirection]
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

    function generatePath() {
        var path = [{
            location: world.startingPoints[Math.floor(Math.random() * world.startingPoints.length)],
            type: "absolute"
        }];

        var addedLocations = {};
        addedLocations[path[0].location.toString()] = true;

        var lastDirection = null;
        var size = Math.floor(Math.random() * 3) + 3;
        var done = false;
        var i = 1;
        do {
            start(path[i - 1].location.row, path[i - 1].location.column);
            var scanData = scan();

            var candidateTurnPoints = Object.keys(scanData.lineOfSight).reduce(function(candidateTurnPoints, direction) {
                if(scanData.lineOfSight[direction].turnPoints.length > 0 &&
                    (lastDirection == null ||
                        (lastDirection !== locations.oppositeAbsolute[direction] && lastDirection !== direction))) {
                    candidateTurnPoints[direction] = scanData.lineOfSight[direction].turnPoints;
                }

                return candidateTurnPoints;
            }, {});

            var availableTurnPoints = Object.keys(candidateTurnPoints).reduce(function(availableTurnPoints, direction) {
                if(!candidateTurnPoints[direction].reduce(function(done, turnPoint) {
                    return done && addedLocations[turnPoint.location.toString()];
                }, true)) {
                    availableTurnPoints[direction] = candidateTurnPoints[direction];
                }

                return availableTurnPoints;
            }, {});

            done = Object.keys(availableTurnPoints).length == 0;

            if(!done) {
                var randomDirection = Object.keys(availableTurnPoints)[Math.floor(Math.random() * Object.keys(availableTurnPoints).length)];
                var randomTurnPoint = availableTurnPoints[randomDirection][Math.floor(Math.random() * availableTurnPoints[randomDirection].length)].location;

                var conditional =  true;//Math.floor(Math.random() * 2) === 1;
                if(!conditional) {
                    path.push({
                        location: randomTurnPoint,
                        type: "absolute"
                    });
                } else {
                    var objectsAtLocation;
                }

                lastDirection = path[i - 1].location.compare(randomTurnPoint).absolute;
                addedLocations[randomTurnPoint.toString()] = true;
            }

            i++;
        } while(i < size && !done);

        return path;
    }

    function start(row, column) {
        if (row < 0 || row > 14 || column < 0 || column > 14) {
            throw new RangeError("Illegal coordinates: (", row + ",", column + ")");
        } else if (world.isBlocked(locations.create(row, column))) {
            console.warn("That location is not empty");
        } else {
            location = locations.create(row, column);

            var rect = world.objectAt(location).cell.getBoundingClientRect();
            dalek.style.top = rect.top + "px";
            dalek.style.left = rect.left + "px";
        }
    }

    function turn(direction) {
        var originalOrientation = orientation;
        if (locations.absolute[direction]) {
            orientation = direction;
        } else {
            orientation = locations.absoluteFromRelative[orientation][direction];
        }

        var rotation = parseInt(dalek.style.transform.replace(/[a-z()]/g, ""), 10);
        if(direction === locations.relative.left || locations.relativeFromAbsolute[originalOrientation][orientation] === locations.relative.left) {
            rotation -= 90;
        } else if (direction === locations.relative.right || locations.relativeFromAbsolute[originalOrientation][orientation] === locations.relative.right) {
            rotation += 90;
        } else if(direction === locations.absolute.north) {
            rotation = 0;
        } else if(direction === locations.absolute.south) {
            rotation = 180;
        } else if(direction === locations.absolute.east) {
            rotation = 270;
        } else if(direction === locations.absolute.west) {
            rotation = 90;
        }

        dalek.style.transform = "rotate" + "(" + rotation + "deg)";
    }

    function move(distance) {
        distance = distance || 1;
        for(var i = 0; i < distance; i++) {
            if (!world.isBlocked(location[orientation]())) {
                location = location[orientation]();

                var rect = world.objectAt(location).cell.getBoundingClientRect();
                dalek.style.top = rect.top + "px";
                dalek.style.left = rect.left + "px";
            } else {
                throw new RangeError("Robot crashed into the wall :(");
            }
        }
    }

    return {
        start: start,
        turn: turn,
        move: move,
        orientation: function () {
            return orientation;
        },
        location: location,
        scan: scan,
        render: function () {
            if(dalek == null) {
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

                var rect = world.objectAt(location).cell.getBoundingClientRect();
                dalek.style.top = rect.top + "px";
                dalek.style.left = rect.left + "px";
                dalek.style.height = rect.height + "px";
                dalek.style.width = rect.width + "px";

                document.body.appendChild(dalek);
            }
        },
        parse: parser.parse,
        generatePath: generatePath
    };

})(world);

window.onload = function () {
    world.render();
    robot.render();
};