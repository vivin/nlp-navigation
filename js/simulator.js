var world = (function() {
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
            attributes: ["red", "blue", "green", "yellow", "grey"]
        },
        D: {
            name: "door",
            attributes: ["main", "open", "locked", "glass", "steel", "red"]
        },
        P: {
            name: "painting",
            attributes: ["old", "abstract", "classic", "modern"]
        },
        w: {
            name: "window",
            attributes: ["open", "closed", "blue"]
        },
        "~": {
            name: "hallway",
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
            reference: true
        },
        LL: {
            name: "lamp",
            attribute: null,
            reference: true
        },
        XX: {
            space: true,
            reference: false
        }
    };

    var grid = worldTemplate.match(/.{30}/g).reduce(function(grid, line) {
        grid.push(line.match( /.{2}/g).reduce(function(row, cell) {
            if(/[A-Z~][0-9]/i.test(cell)) {
                var object = objects[cell.split("")[0]];
                row.push({
                    name: object.name,
                    path: object.name === "hallway",
                    space: object.name === "hallway",
                    reference: true,
                    attribute: object.attributes[cell.split("")[1]]
                });
            } else if(/[A-Z]{2}/.test(cell)) {
                row.push(objects[cell]);
            } else {
                row.push({
                    path: true,
                    space: true
                });
            }

            return row;
        }, []));

        return grid;
    }, []);

    var startingPoints = grid.reduce(function(startingPoints, objects, row) {
        objects.forEach(function(object, column) {
            if(object.path) {
                startingPoints.push(location(row, column));
            }
        });

        return startingPoints;
    }, []);

    function location(row, column) {
        return {
            row: row,
            column: column,
            north: function() {
                return location(row - 1 < 0 ? 0 : row - 1, column);
            },
            south: function() {
                return location(row + 1 > 14 ? 14 : row + 1, column);
            },
            east: function() {
                return location(row, column + 1 > 14 ? 14 : column + 1);
            },
            west: function() {
                return location(row, column - 1 < 0 ? 0 : column - 1);
            }
        };
    }

    function render() {
        var table = document.getElementById("world");
        grid.forEach(function(objects) {
            var row = document.createElement("tr");
            objects.forEach(function(object) {
                var cell = document.createElement("td");
                if(!object.space || object.name === "hallway") {
                    if(object.name !== "hallway") {
                        cell.style.backgroundImage = "url(images/" + object.name + "/" + (object.attribute || object.name) + ".jpg)";
                    } else {
                        cell.style.backgroundImage = "url(images/" + object.attribute.name + "/" + object.attribute.attribute + ".jpg)";
                        cell.style.opacity = "0.5";
                        cell.style.backgroundColor = "#d0d0d0";
                    }

                    cell.style.backgroundSize = "100%";
                } else if(!object.path) {
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
        objectAt: function(location) {
            return grid[location.row][location.column];
        },
        isBlocked: function(location) {
            return grid[location.row][location.column].reference || false;
        },
        location: location,
        render: render
    };
})();

var robot = (function(world) {

    var dalek = null;

    var absolute = {
        north: "north",
        south: "south",
        east: "east",
        west: "west"
    };

    var relative  = {
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

    var location = world.startingPoints[Math.floor(Math.random() * world.startingPoints.length)];

    var orientation = absolute.north;

    function scan() {
        var sensorData = {
            orientation: orientation,
            immediate: immediateScan(location),
            lineOfSight: {}
        };

        ["north", "south", "east", "west"].forEach(function(absoluteDirection) {
            sensorData.lineOfSight[absoluteDirection] = [];

            var currentLocation = location[absoluteDirection]();
            while(!world.isBlocked(currentLocation)) {
                sensorData.lineOfSight[absoluteDirection] = sensorData.lineOfSight[absoluteDirection].concat(immediateScan(currentLocation));
                currentLocation = currentLocation[absoluteDirection]();
            }
        });

        function immediateScan(location) {
            var objects = [];
            ["north", "south", "east", "west"].forEach(function(absoluteDirection) {
                var currentLocation = location[absoluteDirection]();
                if(world.objectAt(currentLocation).reference) {
                    var object = world.objectAt(currentLocation);
                    objects.push({
                        name: object.name,
                        attribute: object.attribute,
                        position: {
                            row: currentLocation.row,
                            column: currentLocation.column,
                            absolute: absolute[absoluteDirection],
                            relative: relativeFromAbsolute[orientation][absoluteDirection]
                        }
                    });
                }
            });

            return objects;
        }

        return sensorData;
    }

    return {
        start: function(row, column) {
            if(row < 0 || row > 14 || column < 0 || column > 14) {
                throw new RangeError("Illegal coordinates: (", row + ",", column + ")");
            } else if(world.isBlocked(world.location(row, column))) {
                console.warn("That location is not empty");
            } else {
                location = world.location(row, column);
            }
        },
        turn: function(direction) {
            if(absolute[direction]) {
                orientation = direction;
            } else {
                orientation = absoluteFromRelative[orientation][direction];
            }

            if(orientation === absolute.north) {
                dalek.style.transform = "rotate(0deg)";
            } else if(orientation === absolute.east) {
                dalek.style.transform = "rotate(90deg)";
            } else if(orientation === absolute.west) {
                dalek.style.transform = "rotate(-90deg)";
            } else if(orientation === absolute.south) {
                dalek.style.transform = "rotate(180deg)";
            }
        },
        move: function() {
            if(!world.isBlocked(location[orientation]())) {
                location = location[orientation]();

                var rect = world.objectAt(location).cell.getBoundingClientRect();
                dalek.style.top = rect.top + "px";
                dalek.style.left = rect.left + "px";
            } else {
                console.warn("Cannot move! Way is blocked!");
            }
        },
        orientation: function() {
            return orientation;
        },
        location: function() {
            return location;
        },
        scan: scan,
        render: function() {
            dalek = document.createElement("div");

            dalek.style.backgroundImage = "url(images/dalek.png)";
            dalek.style.height = "75px";
            dalek.style.width = "75px";
            dalek.style.backgroundSize = "100%";
            dalek.style.position = "absolute";
            dalek.style.zIndex = 2;

            var rect = world.objectAt(location).cell.getBoundingClientRect();
            dalek.style.top = rect.top + "px";
            dalek.style.left = rect.left + "px";

            document.body.appendChild(dalek);
        },
        direction: {
            absolute: absolute,
            relative: relative
        }
    };
})(world);

window.onload = function() {
    world.render();
    robot.render();
};