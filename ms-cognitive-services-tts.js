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
				
				if (msg.payload !== undefined && msg.payload !== null)
				{
					if (msg.payload.text !== undefined) {
						textToSynthesize = msg.payload.text;
					}
					
					if (msg.payload.voice !== undefined) {
						voice = msg.payload.voice;
					}
				}
				
				const ssml = '<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">' +
							 '  <voice name="'+ voice+'">' +
							 '    <mstts:express-as style="General">' + 
							 '      <prosody rate="0%" pitch="0%">' + textToSynthesize + '</prosody>' +
							 '    </mstts:express-as>' +
							 '  </voice>' + 
							 '</speak>';
							 
				const filename = md5(ssml) + ".wav";
				const filepath = "/data/myModules/node-red-contrib-ms-cognitive-services/audioFiles/" + filename;
								
				if (fs.existsSync(filepath)){
					msg.audioFile = filename;
					msg.audioResult = "Skipped";
					node.send(msg);
					node.status({fill:"green",shape:"dot",text:"Successfull | Skipped"});
					return;
				}
				
				const speechConfig = sdk.SpeechConfig.fromSubscription(configNode.apiKey, configNode.region);
				const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);

				const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
							 
				node.status({fill:"yellow",shape:"dot",text:"Requesting"});
				
				synthesizer.speakSsmlAsync(
					ssml,
					result => {
						node.status({fill:"green",shape:"dot",text:"Successfull | Downloaded"});
						if (result) {
							if (result.privErrorDetails !== undefined)
							{
								handleError(result.privErrorDetails);
							}
							else
							{					
								msg.payload = result;
								msg.audioFile = filename;
								msg.audioResult = "Downloaded";
								node.send(msg);
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