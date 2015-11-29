set CONFIG=%1
echo Config = %CONFIG%
SHIFT
java -Djava.util.logging.config.file=logging.properties -Dgui=false -Xmx1000m %1 %2 %3 %4 -cp .\NL2KR.jar;lib\* nl2kr.scripts.NL2KR_LTest %CONFIG%
