module.exports = function(RED) {
	
    function MCSSpeechToTextNode(config) {
		"use strict";
		RED.nodes.createNode(this,config);
		
        var configNode = RED.nodes.getNode(config.apiConfig);
        var node = this;
		
		// pull in the required packages.
		var sdk = require("microsoft-cognitiveservices-speech-sdk");
		var fs  = require("fs");
		var md5 = require("md5");
		var ogg = require("ogg");
		
		function handleError(error){
			node.error(error);
			node.status({fill:"red",shape:"dot",text:"Error"});
		}
		
        node.on('input', function(msg) {
			try{
                const speechConfig = sdk.SpeechConfig.fromSubscription(configNode.credentials.apiKey, configNode.region);
                speechConfig.speechRecognitionLanguage = "de-DE";
                
                var pushStream = sdk.AudioInputStream.createPushStream();

                fs.createReadStream(msg.payload.path).on('data', function(arrayBuffer) {
                    pushStream.write(arrayBuffer.slice());
                  }).on('end', function() {
                    pushStream.close();
                    // now create the audio-config pointing to our stream and
                    // the speech config specifying the language.
                    var audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

                    node.error("Starting to recognize");

                    const recognizer  = new sdk.SpeechRecognizer(speechConfig, audioConfig);
                                
                    node.status({fill:"yellow",shape:"dot",text:"Requesting"});
                    
                    recognizer.recognizeOnceAsync(
                        result => {
                            msg.recognitionResult = result;
                            node.send(msg);
                            switch (result.reason) {
                                case sdk.ResultReason.RecognizedSpeech:
                                    node.error(`RECOGNIZED: Text=${result.text}`);
                                    node.error("    Intent not recognized.");
                                    break;
                                case sdk.ResultReason.NoMatch:
                                    node.error("NOMATCH: Speech could not be recognized.");
                                    break;
                                case sdk.ResultReason.Canceled:
                                    const cancellation = sdk.CancellationDetails.fromResult(result);
                                    node.error(`CANCELED: Reason=${cancellation.reason}`);
                            
                                    if (cancellation.reason == sdk.CancellationReason.Error) {
                                        node.error(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                                        node.error(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                                        node.error("CANCELED: Did you update the subscription info?");
                                    }
                                    break;
                                default:
                                    node.error(result.reason);
                            }
                        },
                        error => {
                            handleError(error);
                        });	
                  });


                  /*
                var decoder = new ogg.Decoder();
                decoder.on('stream', function (stream) {
                    node.error("new \"stream\": " + stream.serialno);

                    // emitted for each `ogg_packet` instance in the stream.
                    stream.on('data', function (packet) {
                        pushStream.write(packet.slice());
                    });

                    // emitted after the last packet of the stream
                    stream.on('end', function () {
                        node.error("end");
                        pushStream.close();
                        
                        // now create the audio-config pointing to our stream and
                        // the speech config specifying the language.
                        var audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

                        node.error("Starting to recognize");

                        const recognizer  = new sdk.SpeechRecognizer(speechConfig, audioConfig);
                                    
                        node.status({fill:"yellow",shape:"dot",text:"Requesting"});
                        
                        recognizer.recognizeOnceAsync(
                            result => {
                                msg.recognitionResult = result;
                                node.send(msg);
                                switch (result.reason) {
                                    case sdk.ResultReason.RecognizedSpeech:
                                        node.error(`RECOGNIZED: Text=${result.text}`);
                                        node.error("    Intent not recognized.");
                                        break;
                                    case sdk.ResultReason.NoMatch:
                                        node.error("NOMATCH: Speech could not be recognized.");
                                        break;
                                    case sdk.ResultReason.Canceled:
                                        const cancellation = sdk.CancellationDetails.fromResult(result);
                                        node.error(`CANCELED: Reason=${cancellation.reason}`);
                                
                                        if (cancellation.reason == sdk.CancellationReason.Error) {
                                            node.error(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                                            node.error(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                                            node.error("CANCELED: Did you update the subscription info?");
                                        }
                                        break;
                                    default:
                                        node.error(result.reason);
                                }
                            },
                            error => {
                                handleError(error);
                            });	
                    });
                });

                fs.createReadStream(msg.payload.path).pipe(decoder);
                */
				
                
			} catch(err){
				handleError(err);
			}
        });
    }
    RED.nodes.registerType("ms-cognitive-services-stt",MCSSpeechToTextNode);
}