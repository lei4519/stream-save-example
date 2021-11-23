async function register() {
  // 已注册
  const registed = await navigator.serviceWorker.getRegistration("./");
  if (registed?.active) return registed.active;
  console.log('注册 service worker')
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
  const { port1, port2 } = new MessageChannel();

  const sw = await register();
  console.log('申请下载资源');
  sw.postMessage({ filename }, [port2]);

  return new Promise<WritableStream>((r) => {
    port1.onmessage = (e) => {
      if (e.data.download) {
        console.log('发起请求')
        const iframe = document.createElement("iframe");
        iframe.hidden = true;
        iframe.src = e.data.download;
        iframe.name = "iframe";
        document.body.appendChild(iframe);
        r(e.data.writable);
      }
    };
  });
}
