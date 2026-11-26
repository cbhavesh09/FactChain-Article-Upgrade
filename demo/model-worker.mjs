self.onmessage = async ({ data: prompt }) => {
  try {
    const modelLibrary = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
    const { pipeline } = await import(/* @vite-ignore */ modelLibrary);
    const generate = await pipeline("text2text-generation", "Xenova/flan-t5-small", {
      device: "wasm",
      dtype: "q8",
      progress_callback(progress) {
        if (progress.status === "progress" && progress.file?.endsWith(".onnx")) {
          self.postMessage({ progress: progress.progress / 100 });
        }
      },
    });
    self.postMessage({ generating: true });
    const [{ generated_text: answer }] = await generate(prompt, {
      max_new_tokens: 80,
      do_sample: false,
      no_repeat_ngram_size: 3,
    });
    self.postMessage({ answer });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};


