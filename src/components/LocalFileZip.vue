<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import * as fflate from "fflate";
import {
  createDownloadStream,
  readStreamAndWriteZipStream,
} from "../utils/common";

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;

    const stream = (await createDownloadStream("LocalFileZip.zip")).getWriter();

    const backpressure = {
      current: [] as unknown as [
        ReadableStreamDefaultReader,
        fflate.ZipDeflate
      ],
      endResolve: () => Promise.resolve(),
      end() {
        return new Promise((r: any) => (this.endResolve = r));
      },
      start() {
        const current = this.queue.shift();
        if (!current) return this.endResolve();
        this.current = current;
        return this.fire();
      },
      fire() {
        const [reader, zipStream] = this.current;
        reader.read().then(({ done, value = new Uint8Array() }) => {
          zipStream.push(value, done);
          if (done) {
            return this.start();
          }
        });
      },
      queue: [] as Array<[ReadableStreamDefaultReader, fflate.ZipDeflate]>,
      enqueue(
        reader: ReadableStreamDefaultReader,
        zipStream: fflate.ZipDeflate
      ) {
        this.queue.push([reader, zipStream]);
      },
    };

    const zip = new fflate.Zip((err, dat, final) => {
      if (err || final) {
        stream.close();
      } else {
        console.log(1);
        stream.write(dat).then(() => {
          console.log(2);
          backpressure.fire();
        });
      }
    });
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      const zipStream = new fflate.ZipDeflate(file.name, {
        level: 9,
      });
      backpressure.enqueue(file.stream().getReader(), zipStream);
      zip.add(zipStream);
    }
    backpressure.start();
    await backpressure.end();
    zip.end();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">流式 文件打包</button>
  <input ref="inputRef" multiple type="file" hidden />
</template>
