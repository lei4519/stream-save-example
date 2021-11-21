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

    const stream = await (await createDownloadStream("LocalFileZip.zip")).getWriter();
    const zip = new fflate.Zip((err, dat, final) => {
      if (err || final) {
        stream.close();
      } else {
        stream.write(dat);
      }
    });
    const filesStream = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      const zipStream = new fflate.ZipDeflate(file.name, {
        level: 9,
      });
      zip.add(zipStream);
      filesStream.push([file.stream().getReader(), zipStream] as const);
    }
    await Promise.all(
      filesStream.map((args) => readStreamAndWriteZipStream(...args))
    );
    zip.end();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">本地多文件打包</button>
  <input ref="inputRef" multiple type="file" hidden />
</template>
