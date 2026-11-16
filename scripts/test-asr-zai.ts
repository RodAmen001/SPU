// Test direct de l'ASR du SDK z-ai (réponse brute)
import ZAI from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

const wav = readFileSync('/tmp/spu-boost/7934e0c9601e0059/theatre.wav');
const zai = await ZAI.create();
const reponse = await zai.audio.asr.create({ file_base64: wav.toString('base64') });
console.log(JSON.stringify(reponse, null, 2).slice(0, 800));
