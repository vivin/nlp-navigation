var simulation = (function(){
    //var sentence = 'start(3,1)';
    //var sentence = 'turn(until(is(plant(plotted),at(left))))';
    //var sentence = 'turn(left)'
    //var sentence = 'move(spaces(5))'
    function simulate(sentence) {
        if (sentence.length != 0) {
            var object = parser.parse(sentence).forEach(function (element) {
                var action = element.instruction
                //alert(action)
                if (action === 'start')
                    robot.start(element.arguments.row, element.arguments.column)
                if (action === 'turn') {
                    if (element.arguments.direction != null)
                        robot.turn(element.arguments.direction)
                    else if (element.arguments.until != null) {
                        numberOfTurns = 0
                        do {
                            var allTrue = false
                            scan = robot.scan()
                            element.arguments.until.forEach(function (condition) {
                                if (condition.orientation.direction!=null){
                                    for (i=0;i<scan.immediate.objects.length;i++){
                                        object = scan.immediate.objects[i]
                                        if (object.position.relative === condition.orientation.direction &&
                                            object.name === condition.object.name ) {
                                            if (typeof (object.attribute) === 'string') {
                                                if (condition.object.attributes[0] == object.attribute) {
                                                    allTrue = true
                                                    break
                                                }
                                            }
                                            else{
                                                    if (condition.object.attributes[0] ===
                                                        object.attribute.attribute.concat(' ').concat(object.attribute.attribute.name)) {
                                                        allTrue = true
                                                        break
                                                    }
                                                }
                                        }
                                            }
                                        }
                                    });
                            if (allTrue) break;
                            else robot.turn('left')
                            numberOfTurns +=1
                        }while (numberOfTurns<4)
                                //if(condition.object === world.objectAt(robot.location()))
                    }
                }
                if (action === 'move') {
                    var scan = robot.scan()
                    if (scan.immediate.paths.indexOf(scan.orientation)>=0) {
                        if (element.arguments.distance != null) {
                            robot.move(element.arguments.distance.magnitude)
                        }
                        else
                            until(action,objects)
                    }
                }
            });
        }
    }

    return {
        simulate: simulate
    }
})();

window.onload = function () {
    world.render();
    robot.render();
    simulation.simulate(sentence)
};