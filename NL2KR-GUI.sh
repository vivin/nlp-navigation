CONFIG=$1
shift
java -Djava.util.logging.config.file=logging.properties  -Xmx1000m -Dgui=true $@ -cp ./NL2KR.jar:lib/* nl2kr.scripts.NL2KR_LTest $CONFIG
