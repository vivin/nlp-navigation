var world = (function() {
    var worldTemplate =
        "W3P2W3W3w0W3W3w0W3W3w0W3W3P3W1" +
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

    var objects = {
        W: {
            name: "wall",
            attributes: ["red", "blue", "yellow", "green", "grey"]
        },
        D: {
            name: "door",
            attributes: ["main", "open", "locked", "glass", "closed", "white"]
        },
        P: {
            name: "painting",
            attributes: ["old", "abstract", "classic", "modern"]
        },
        w: {
            name: "window",
            attributes: ["open", "closed"]
        },
        "~": {
            name: "hallway",
            path: true,
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
            attribute: "potted"
        },
        LL: {
            name: "lamp",
            attribute: null
        },
        XX: {
            name: "x",
            attribute: null
        }
    };

    var grid = worldTemplate.match(/.{30}/g).reduce(function(grid, line) {
        grid.push(line.match( /.{2}/g).reduce(function(row, cell) {
            if(/[A-Z~][0-9]/i.test(cell)) {
                var object = objects[cell.split("")[0]];
                row.push({
                    name: object.name,
                    path: object.path,
                    attribute: object.attributes[cell.split("")[1]]
                });
            } else if(/[A-Z]{2}/.test(cell)) {
                row.push(objects[cell]);
            } else {
                row.push({
                    path: true,
                    attribute: null
                });
            }

            return row;
        }, []));

        return grid;
    }, []);

    var startingPoints = grid.reduce(function(startingPoints, objects, row) {
        objects.forEach(function(object, column) {
            if(object.path) {
                startingPoints.push({
                    row: row,
                    column: column
                });
            }
        });

        return startingPoints;
    }, []);

    function render() {
        var table = document.getElementById("world");
        grid.forEach(function(objects) {
            var row = document.createElement("tr");
            objects.forEach(function(object) {
                var cell = document.createElement("td");
                if(!object.path) {
                    cell.innerHTML = object.name[0].toUpperCase();
                    cell.style.backgroundColor = "#d8d8d8";
                }
                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    }

    return {
        grid: grid,
        startingPoints: startingPoints,
        render: render
    };
})();

var robot = (function() {
    var location = null;

    function start(startingPoints) {
        var location = startingPoints[Math.floor(Math.random() * startingPoints.length)];
    }

    function sense() {
        var sensorOutput = {
            immediate: [],
            lineOfSight: {
                referencePoints: [],
                destinations: []
            }
        }
    }

    //todo: the rest
})();

window.onload = world.render;