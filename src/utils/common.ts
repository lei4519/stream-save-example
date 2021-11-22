
import * as fflate from "fflate";
async function register() {
  // 已注册
  const registed = await navigator.serviceWorker.getRegistration("./");
  if (registed?.active) return registed.active;

  const swRegistration = await navigator.serviceWorker.register("sw.js", {
    scope: "./",
  });

  const sw = swRegistration.installing! || swRegistration.waiting!;

  let listen: any;

  return new Promise<ServiceWorker>((resolve) => {
    sw.addEventListener(
      "statechange",
      (listen = () => {
        if (sw.state === "activated") {
          sw.removeEventListener("statechange", listen);
          resolve(swRegistration.active!);
        }
      })
    );
  });
}

// 创建下载流
export async function createDownloadStream(filename: string) {
  const channel = new MessageChannel();
  const streamSend = channel.port1;
  const streamReceive = channel.port2;

  const sw = await register();

  sw.postMessage({ filename }, [streamReceive]);

  const writable = await new Promise<WritableStream>((r) => {
    streamSend.onmessage = (e) => {
      if (e.data.download) {
        const iframe = document.createElement("iframe");
        iframe.hidden = true;
        iframe.src = e.data.download;
        iframe.name = "iframe";
        document.body.appendChild(iframe);
        r(e.data.writable);
      }
    };
  });

  return writable
}

// 读取文件流，并写入 zip 流
export async function readStreamAndWriteZipStream(reader: ReadableStreamDefaultReader, zipStream: fflate.ZipDeflate) {
  while (true) {
    const { done, value = new Uint8Array() } = await reader.read();
    zipStream.push(value, done);
    if (done) break;
  }
};