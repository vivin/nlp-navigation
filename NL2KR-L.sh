CONFIG=$1
shift
java -Djava.util.logging.config.file=logging.properties -Dgui=false -Xmx1000m $@ -cp ./NL2KR.jar:lib/* nl2kr.scripts.NL2KR_LTest $CONFIG
