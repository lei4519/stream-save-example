<script setup lang="ts">
import { onMounted, ref } from "@vue/runtime-core";
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const inputRef = ref<HTMLInputElement | null>(null);
onMounted(() => {
  inputRef.value?.addEventListener("change", async (e: any) => {
    const file = e.target!.files[0]!
    const zip = new JSZip();
    zip.file(file.name, file);
    const blob = await zip.generateAsync({type:"blob"})
    saveAs(blob, "example.zip");
  });
});
</script>

<template>
  <button @click="inputRef?.click()">JSZip 文件打包</button>
  <input ref="inputRef" multiple type="file" hidden />
</template>
