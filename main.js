const serial = chrome.serial;

var onGetDevices = function(ports) {				//Lista as portas seriais disponiveis
  for (var i=0; i<ports.length; i++) {
	document.getElementById('portas').options[document.getElementById('portas').options.length] = new Option(ports[i].path, i);
  }
}
chrome.serial.getDevices(onGetDevices);				//-------------------------------------

var DEVICE_PATH = ''//'COM5';

/* Interprets an ArrayBuffer as UTF-8 encoded string data. */
var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var encodedString = String.fromCharCode.apply(null, bufView);
  return decodeURIComponent(escape(encodedString));
};

/* Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. */
var str2ab = function(str) {
  var encodedString = unescape(encodeURIComponent(str));
  var bytes = new Uint8Array(encodedString.length);
  for (var i = 0; i < encodedString.length; ++i) {
    bytes[i] = encodedString.charCodeAt(i);
  }
  return bytes.buffer;
};

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

var SerialConnection = function() {
  this.connectionId = -1;
  this.lineBuffer = "";
  this.boundOnReceive = this.onReceive.bind(this);
  this.boundOnReceiveError = this.onReceiveError.bind(this);
};

var conectado = false;
SerialConnection.prototype.onConnectComplete = function(connectionInfo) {
  if (!connectionInfo) {
    log("O Arduino não está conectado.");
    return;
  }
  this.connectionId = connectionInfo.connectionId;
  chrome.serial.onReceive.addListener(this.boundOnReceive);
  chrome.serial.onReceiveError.addListener(this.boundOnReceiveError);
  
  log("Arduino conectado");
  conectado = true;
};

SerialConnection.prototype.onReceive = function(receiveInfo) {
  if (receiveInfo.connectionId !== this.connectionId) {
    return;
  }

  this.lineBuffer += ab2str(receiveInfo.data);
 
  var index;
  while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
    var line = this.lineBuffer.substr(0, index + 1);
	logJSON(line)
	
    this.lineBuffer = this.lineBuffer.substr(index + 1);
  }

};

SerialConnection.prototype.onReceiveError = function(errorInfo) {
  if (errorInfo.connectionId === this.connectionId) {
    concsole.error(errorInfo.error);
  }
};

SerialConnection.prototype.connect = function(path) {
  serial.connect(path, this.onConnectComplete.bind(this))
};

SerialConnection.prototype.send = function(msg) {
  if (this.connectionId < 0) {
    throw 'Invalid connection';
  }
  serial.send(this.connectionId, str2ab(msg), function() {});
};

SerialConnection.prototype.disconnect = function() {
  if (this.connectionId < 0) {
    throw 'Invalid connection';
  }
  serial.disconnect(this.connectionId, function() {});
};

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

var connection = new SerialConnection();

document.getElementById('conectar').onclick = function() {	
	if (document.getElementById('portas').options[document.getElementById('portas').selectedIndex] == undefined){
		log('Porta nao selecionada');
	} else{
		DEVICE_PATH = document.getElementById('portas').options[document.getElementById('portas').selectedIndex].text;
		connection.connect(DEVICE_PATH);
	}
}

function logJSON(ledstatus) {

  // Get the LED status from the Json returned by the Serial
  // 0 = off | 1 = on
  ledstatus = JSON.parse( ledstatus ).ledStatus ;

  // Set the circle color according with the LED status
  if (ledstatus == 0)
     document.getElementById('circulo').style.fill = "red";
  else
    document.getElementById('circulo').style.fill = "green";

  // Print led Status to HTML buffer area
  //log(ledstatus) -------------------------------------------------
}


function log(msg) {
  document.getElementById('buffer').innerHTML +=  msg + "<br/>";
}

var is_on = false;
document.getElementById('led').onclick = function() {
	if (conectado){
		is_on = !is_on;
		connection.send(is_on ? 'y' : 'n');
	}else{
		log('O arduino ainda não foi conectado')
	}
};

function horas() {
	var data = new Date();
	var minuto = data.getMinutes();
	var segundo = data.getSeconds();
	
	var hora = data.getHours();
	if(hora < 10){ 
	hora = "0" + hora;
	if(minuto < 10) minuto = "0" + minuto;
	if(segundo < 10) segundo = "0" + segundo;
	return "São " + hora + ":" + minuto + ":" + segundo;
	} else {
		if(minuto <= 1 && segundo >0){
			return "São " + hora + " horas " + minuto + " minuto " + " e " + segundo + " segundos";
		}
		if(minuto > 0 && segundo <= 1){
			return "São " + hora + " horas " + minuto + "minutos " + " e " + segundo + " segundo";
		}
		if(minuto <= 1 && segundo <= 1){
			return "São " + hora + " horas " + minuto + " minuto " + " e " + segundo + " segundo";
		}
		if(minuto > 0 && segundo >0){
			return "São " + hora + " horas " + minuto + " minutos " + " e " + segundo + " segundos";
		}
	}
}


// Função Reconhecimento de fala:
var speechRecognizer = new webkitSpeechRecognition();
var pres = false;

document.getElementById('fala').onclick = function() {
	if (!pres){
		speechRecognizer.continuous = true;
		speechRecognizer.interimResults = true;
		speechRecognizer.lang = 'pt-BR';
		speechRecognizer.start();

		speechRecognizer.onresult = function(event){
			var interimTranscripts = '';
			var finalTranscripts = '';
			for(var i = event.resultIndex; i < event.results.length; i++){
				var transcript = event.results[i][0].transcript;
				transcript.replace("\n", "<br>");
				if(event.results[i].isFinal){
					finalTranscripts = transcript;
					log(finalTranscripts);
					
					if(transcript.indexOf('horas') > -1){
						log(horas());
						window.speechSynthesis.speak(new SpeechSynthesisUtterance(horas()));
					}
					
				}else{
					interimTranscripts += transcript;
				}
			}
			document.getElementById('result').innerHTML = finalTranscripts + '<span style="color:#999">' + interimTranscripts + '</span>';
			
		};
		speechRecognizer.onerror = function (e) {
			console.error("Erro(Provavelmente o problema está no microfone):" + e.message);
		};
		pres = true;
		document.getElementById('fala').style.backgroundColor = "gray";
	}else{
		speechRecognizer.stop();
		pres = false;
		document.getElementById('fala').style.backgroundColor = "white";
	};
};