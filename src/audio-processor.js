// Audio Worklet Processor for high-performance audio processing
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.samplesPerChunk = 24000 * 0.1; // 0.1 seconds at 24kHz
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input[0]) {
            this.buffer.push(...input[0]);
            
            // Process in chunks
            while (this.buffer.length >= this.samplesPerChunk) {
                const chunk = this.buffer.splice(0, this.samplesPerChunk);
                this.port.postMessage({ type: 'audioChunk', data: chunk });
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
