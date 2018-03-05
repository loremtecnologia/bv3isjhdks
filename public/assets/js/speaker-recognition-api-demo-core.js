function enrollNewProfile() {
	navigator.getUserMedia({ audio: true }, function (stream) {
		//console.log('São 20 segundos de gravação.');
		//console.log('Iniciando a gravação agora.');
		$("#linhaIdentificar li:last").append("<li>Iniciando gravação.</li>");
		startCountdown(20, 'identificar');
		$('#btnIdentificar').prop('disabled', true);
		$('#cpf').prop('disabled', true);

		$("#statusIdentificar").html("gravando <img src=\"assets/images/recordingIcon.gif\" width=\"24\" height=\"24\" />");

		onMediaSuccess(stream, createProfile, 20);
	}, onMediaError);
}

function startListeningForIdentification() {
	if (profileIds.length > 0) {
		navigator.getUserMedia({ audio: true }, function (stream) {
			//console.log('-------------------------//----------------------');
			//console.log('São 10 segundos de gravação.');
			//console.log('Iniciando a gravação agora.');
			startCountdown(9, 'reconhecer');
			$("#statusReconhecer").html("gravando <img src=\"assets/images/recordingIcon.gif\" width=\"24\" height=\"24\" />");

			onMediaSuccess(stream, identifyProfile, 10)
		}, onMediaError);
	} else {
		//console.log('Não temos nenhum cadastro de voz.');
	}
}

function onMediaError(e) {
	//console.error('Preciso de permisão pra acessar o microfone.', e);
}

function identifyProfile(blob) {
	for (let index = 0, lenprof = profileIds.length; index < lenprof; index++) {
		var Ids = profileIds[index].map(x => x.profileId).join();
		identifyProfileTeste(blob, Ids, index)
	}
}


function identifyProfileTeste(blob, Ids, index) {
	$("#statusReconhecer").html("processando <img src=\"assets/images/giphy.webp\" width=\"24\" height=\"24\" />");
	//console.log("3 etapa identificação procurando na lista, gera um ID no location")
	addAudioPlayer(blob, "reconhecer");
	const identify = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identify?identificationProfileIds=' + Ids + '&shortAudio=true';

	var request = new XMLHttpRequest();
	request.open("POST", identify, true);

	request.setRequestHeader('Content-Type', 'application/json');
	request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

	request.onload = function () {
		//console.log('Aguarde! Estamos identificando sua voz...');//console.log(request.responseText);

		var location = request.getResponseHeader('Operation-Location');

		if (location != null) {
			pollForIdentification(location, index);
		} else {
			//console.log('Erro: favor gravar novamente.');
		}
	};
	request.send(blob);
}

function createProfile(blob) {
	//console.log("1 etapa entra aqui para criar profile");
	//console.log('Aguarde! Estamos processando a gravação....')

	$("#statusIdentificar").html("processando <img src=\"assets/images/giphy.webp\" width=\"24\" height=\"24\" />");

	addAudioPlayer(blob, "identificar");

	var create = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identificationProfiles';

	var request = new XMLHttpRequest();
	request.open("POST", create, true);

	request.setRequestHeader('Content-Type', 'application/json');
	request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

	request.onload = function () {
		//console.log('Criando Usuario: ' + JSON.parse(request.responseText).identificationProfileId);
		var json = JSON.parse(request.responseText);
		var profileId = json.identificationProfileId;

		enrollProfileAudio(blob, profileId);
	};

	request.send(JSON.stringify({ 'locale': 'en-us' }));
}

function enrollProfileAudio(blob, profileId) {
	//console.log("2 etapa entra aqui usando o profile criado anteriormente e gera um id da voz no location");
	const enroll = 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identificationProfiles/' + profileId + '/enroll?shortAudio=true';

	var request = new XMLHttpRequest();
	request.open("POST", enroll, true);

	request.setRequestHeader('Content-Type', 'multipart/form-data');
	request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

	request.onload = function () {
		//console.log('Preciso Vincular seu nome');
		//console.log(request.responseText);
		var location = request.getResponseHeader('Operation-Location');

		//console.log(location);

		if (location != null) {
			pollForEnrollment(location, profileId);
		} else {
			//console.log('Erro: tente novamente');
		}
	};

	request.send(blob);
}

function pollForEnrollment(location, profileId) {

	var success = false;
	var enrolledInterval;

	enrolledInterval = setInterval(function () {
		var request = new XMLHttpRequest();
		request.open("GET", location, true);

		request.setRequestHeader('Content-Type', 'multipart/form-data');
		request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

		request.onload = function () {
			var json = JSON.parse(request.responseText);
			//console.log('status do processo:' json);

			if (json.status == 'succeeded' && json.processingResult.enrollmentStatus == 'Enrolled') {
				clearInterval(enrolledInterval);
				//console.log('Processo Completado');
				var name = $("#cpf").val();

				//profileIds.push(new Profile(name, profileId));

				//salva o profile
				sendbase(name, profileId)

				//console.log("Cadastramento concluído com sucesso.")

				$("#statusIdentificar").html("concluído <img src=\"assets/images/11-32.png\" width=\"24\" height=\"24\" />");

				$('#cpf').val("");
				$('#cpf').prop('disabled', false);
				//TODO limpar campos
				//console.log('O ID: ' + profileId + ' agora pertence ao ' + name);
			}
			else if (json.status == 'succeeded' && json.processingResult.remainingEnrollmentSpeechTime > 0) {
				clearInterval(enrolledInterval);
				//console.log('Erro: preciso que você fale mais coisas');
			}
			else {
				//console.log('Erro: tente novamente');
				//console.log(json);
			}
		};

		request.send();
	}, 4000);
}

function pollForIdentification(location, index) {
	var success = false;
	var enrolledInterval;

	enrolledInterval = setInterval(function () {
		var request = new XMLHttpRequest();
		request.open("GET", location, true);

		request.setRequestHeader('Content-Type', 'multipart/form-data');
		request.setRequestHeader('Ocp-Apim-Subscription-Key', key);

		request.onload = function () {
			var json = JSON.parse(request.responseText);
			//console.log('status da gravaçao ' + json);

			if (json.status == 'succeeded') {
				clearInterval(enrolledInterval);

				Lista_Identificada(json, index)
			}
			else {
				//console.log('erro: tente novamente');
				//console.log(json);
			}
		};

		request.send();
	}, 2000);
}

function Lista_Identificada(json, index) {

	var speaker = profileIds[index].filter(function (p) {
		return p.profileId == json.processingResult.identifiedProfileId
	});

	var confianca = ""
	if (json.processingResult.confidence == "High")
		confianca = "Alta"
	else if (json.processingResult.confidence == "Normal")
		confianca = "Normal"
	else
		confianca = "Baixo"

	if (speaker != null && speaker.length > 0) {
		//console.log('Identificação concluída com sucesso.')
		$("#statusReconhecer").html("concluído <img src=\"assets/images/11-32.png\" width=\"24\" height=\"24\" /><br>Sua voz foi reconhecida no cadastro: " + speaker[0].name + ". Nível de confiança. " + confianca + ".");
		//console.log('Voz identificado como: ' + speaker[0].name + " nivel de confiança " + confianca);
	} else {
		$("#statusReconhecer").html("concluído <img src=\"assets/images/11-32.png\" width=\"24\" height=\"24\" /><br> Sua voz não foi reconhecida.");
		//console.log('Sua voz não foi localizada.');
	}

}

function addAudioPlayer(blob, tipo) {

	var log;

	if (tipo == "identificar") {
		$("#gravacaoIdentificar").text("");
		var log = document.getElementById('gravacaoIdentificar');
	}
	else if (tipo == "reconhecer") {
		$("#gravacaoReconhecer").text("");
		var log = document.getElementById('gravacaoReconhecer');
	}


	//console.log('--------------------------addAudioPlayer-------------------------------');
	var url = URL.createObjectURL(blob);


	var audio = document.querySelector('#replay');
	if (audio != null) { audio.parentNode.removeChild(audio); }

	audio = document.createElement('audio');
	audio.setAttribute('id', 'replay');
	//aqui

	audio.setAttribute('controls', 'controls');

	var source = document.createElement('source');
	source.src = url;

	audio.appendChild(source);
	log.parentNode.insertBefore(audio, log);
}

var qs = (function (a) {
	if (a == "") return {};
	var b = {};
	for (var i = 0; i < a.length; ++i) {
		var p = a[i].split('=', 2);
		if (p.length == 1)
			b[p[0]] = "";
		else
			b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	}
	return b;
})(window.location.search.substr(1).split('&'));

var key = 'e274b430a6bb42c8b9118f34d51392fc'//qs['key'];

var Profile = class { constructor(name, profileId) { this.name = name; this.profileId = profileId; } };
var VerificationProfile = class { constructor(name, profileId) { this.name = name; this.profileId = profileId; this.remainingEnrollments = 3 } };
var profileIds = [];
getbase();
var verificationProfile = new VerificationProfile();

//coloca o console log na tela
(function () {
	var old = console.log;
	var logger = document.getElementById('log');
	var isScrolledToBottom = logger.scrollHeight - logger.clientHeight <= logger.scrollTop + 1;

	console.log = function () {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == 'object') {
				logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
			} else {
				logger.innerHTML += arguments[i] + '<br />';
			}
			if (isScrolledToBottom) logger.scrollTop = logger.scrollHeight - logger.clientHeight;
		}
		old(...arguments);
	}
	console.error = console.log;
})();

function sendbase(name, profileId) {

	for (let index = 0; index < profileIds.length; index++) {
		if (profileIds[index].length < 10) {
			profileIds[index].push({ "name": name, "profileId": profileId });
		} else if (profileIds[index + 1] == undefined) {
			profileIds.push([])
		}
	}

	var url = "https://biometriavocal.firebaseio.com/profiles.json";
	var json = JSON.stringify(profileIds);
	var xhr = new XMLHttpRequest();
	xhr.open("PUT", url, true);
	xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		var users = JSON.parse(xhr.responseText);
		if (xhr.readyState == 4 && xhr.status == "201") {
			//console.table(users);
			getbase()
		} else {
			//console.error(users);
		}
	}
	xhr.send(json);
}

function getbase() {

	var ajax = new XMLHttpRequest();
	ajax.open("GET", "https://biometriavocal.firebaseio.com/profiles.json", true);
	ajax.send();
	ajax.onreadystatechange = function () {
		if (ajax.readyState == 4 && ajax.status == 200) {
			var data = JSON.parse(ajax.responseText);
			profileIds = data
			//console.log(profileIds)
		}
	}
}