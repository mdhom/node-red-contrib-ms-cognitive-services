module.exports = function(RED) {
    function MCSConfigNode(config) {
        RED.nodes.createNode(this,config);
        this.name   = config.name;
        this.apiKey = config.apiKey;
        this.region = config.region;
    }
    RED.nodes.registerType("ms-cognitive-services-config",MCSConfigNode);
	
    function MCSTextToSpeechNode(config) {
		"use strict";
        RED.nodes.createNode(this,config);
        var configNode = RED.nodes.getNode(config.apiConfig);
		
        var node = this;
		
		// pull in the required packages.
		var sdk = require("microsoft-cognitiveservices-speech-sdk");
		var fs = require("fs");
		var md5 = require("md5");
		
		function handleError(error){
			node.error(error);
			node.status({fill:"red",shape:"dot",text:"Error"});
		}
		
        node.on('input', function(msg) {
			try{
				var textToSynthesize = config.text;
				var voice = config.voice;
				var expression = config.expression;
				var rate = config.rate;
				var pitch = config.pitch;
				var storeAndReuse = config.storeAndReuse;
				
				if (msg.payload !== undefined && msg.payload !== null)
				{
					if (msg.payload.text !== undefined) { textToSynthesize = msg.payload.text; }
					if (msg.payload.voice !== undefined) { voice = msg.payload.voice; }
					if (msg.payload.expression !== undefined) { expression = msg.payload.expression; }
					if (msg.payload.rate !== undefined) { rate = msg.payload.rate; }
					if (msg.payload.pitch !== undefined) { pitch = msg.payload.pitch; }
					if (msg.payload.storeAndReuse !== undefined) { storeAndReuse = msg.payload.storeAndReuse; }
				}

				var ssml = '';
				if (expression == 'Chat') {
					ssml = '<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">' +
					'  <voice name="'+ voice+'">' +
					'    <prosody rate="' + rate + '%" pitch="' + pitch + '%">' + textToSynthesize + '</prosody>' +
					'  </voice>' + 
					'</speak>';
				} else {
					ssml = '<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">' +
					'  <voice name="'+ voice+'">' +
					'    <mstts:express-as style="' + expression + '">' + 
					'      <prosody rate="' + rate + '%" pitch="' + pitch + '%">' + textToSynthesize + '</prosody>' +
					'    </mstts:express-as>' +
					'  </voice>' + 
					'</speak>';
				}
							 
				const filename = md5(ssml) + ".wav";
				const fileDirectory = "/data/ms-cognitive-services-audiofiles/";
				const filepath = fileDirectory + filename;

				if (!fs.existsSync(fileDirectory)){
					fs.mkdirSync(fileDirectory);
				}
								
				if (storeAndReuse && fs.existsSync(filepath)){	
					fs.readFile(filepath, function(err, data) {
						if (err) throw err;
						
						msg.payload = data;
						msg.tempFilename = filename;
						node.send(msg);
						node.status({fill:"green",shape:"dot",text:"Successfull | Skipped"});
					});
					return;
				}
				
				const speechConfig = sdk.SpeechConfig.fromSubscription(configNode.apiKey, configNode.region);
				const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);
				const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
							 
				node.status({fill:"yellow",shape:"dot",text:"Requesting"});
				
				synthesizer.speakSsmlAsync(
					ssml,
					result => {
						if (result) {
							if (result.privErrorDetails !== undefined) {
								handleError(result.privErrorDetails);
							} else {		
								fs.readFile(filepath, function(err, data) {
									if (err) throw err;
									
									msg.payload = data;
									msg.tempFilename = filename;
									node.send(msg);
									node.status({fill:"green",shape:"dot",text:"Successfull | Downloaded"});
								});
							}
						} else {
							handleError("No result received");
						}
						synthesizer.close();
					},
					error => {
						handleError(error);
						synthesizer.close();
					});					
			} catch(err){
				handleError(err);
			}
        });
    }
    RED.nodes.registerType("ms-cognitive-services-tts",MCSTextToSpeechNode);
}