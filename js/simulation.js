var simulation = (function(){
    function scanAndCheck(until){
        var flag=false
        scan = robot.scan()
        until.forEach(function (condition) {
            var direction = condition.orientation.direction
            var distance = condition.orientation.distance
            if (direction!=null){
                for (i=0;i<scan.immediate.objects.length;i++){
                    object = scan.immediate.objects[i]

                    if (( object.position.absolute === direction || object.position.relative === direction)
                        && object.name === condition.object.name ) {
                        if (typeof (object.attribute) === 'string') {
                            if ( typeof( condition.object.attributes[0]) != 'undefined' && condition.object.attributes[0] === object.attribute) {
                                flag = true
                                break
                            }
                        }
                        else{
                            if ( typeof(condition.object.attributes[0]) != 'undefined') {
                                if(condition.object.attributes[0].name === object.attribute.name
                                    && condition.object.attributes[0].attributes[0] == object.attribute.attribute ) {
                                    flag = true
                                    break
                                }
                            }
                        }
                    }
                }
            }
            if (distance!=null){
                for(i=0;i<scan.lineOfSight[direction].lenqth;i++) {
                    object = scan.lineOfSight[direction][i]
                    forEach(function(object){
                        if (( object.position.absolute === direction || object.position.relative === direction) &&
                                object.name === condition.object.name){
                            if (typeof (object.attribute) === 'string') {
                                if ( typeof( condition.object.attributes[0]) != 'undefined' && condition.object.attributes[0] === object.attribute) {
                                    flag = true
                                    break
                                }
                            }
                            else{
                                if ( typeof(condition.object.attributes[0]) != 'undefined') {
                                    if(condition.object.attributes[0].name === object.attribute.name
                                        && condition.object.attributes[0].attributes[0] == object.attribute.attribute ) {
                                        flag = true
                                        break
                                    }
                                }
                            }
                        }
                    })
                }


            }
        });
        return flag
    }
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
                            if (scanAndCheck(element.arguments.until)) break;
                            else robot.turn('left')
                            numberOfTurns +=1
                        }while (numberOfTurns<4)
                    }
                }
                if (action === 'move') {
                    var scan = robot.scan()
                    if (scan.immediate.paths.indexOf(scan.orientation)>=0) {
                        if (element.arguments.distance != null) {
                            robot.move(element.arguments.distance.magnitude)
                        }
                        else
                            do{
                                if(scanAndCheck(element.arguments.until)) break;
                                else{
                                     robot.move()
                                }
                            }while(true)
                    }
                }
                if(action === 'verify'){
                    var scan = robot.scan()
                    if (element.arguments.that != null) {
                        if(!scanAndCheck(element.arguments.that))
                            throw new Error('Location not matched')
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