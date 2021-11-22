<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import { createDownloadStream } from "../utils/common";

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const files: FileList = e.target!.files;
    if (files.length === 0) return;

    const file = files.item(0)!;
    const reader = file.stream().getReader();

    const writable = await createDownloadStream(file.name);
    const stream = writable.getWriter()

    const pump: any = () =>
      reader
        .read()
        .then((res) =>
          res.done ? stream.close() : stream.write(res.value).then(pump)
        );

    pump();
  });
});
</script>

<template>
  <button @click="inputRef?.click()">本地流式文件下载</button>
  <input ref="inputRef" type="file" hidden />
</template>
