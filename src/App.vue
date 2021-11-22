<script setup lang="ts">
import LocalFileDownload from "./components/LocalFileDownload.vue";
import SaveLocalFileDownload from "./components/SaveLocalFileDownload.vue";
import LocalFileZip from "./components/LocalFileZip.vue";
import SavesLocalFIleZip from "./components/SavesLocalFIleZip.vue";
import LocalFileFullDownload from "./components/LocalFileFullDownload.vue";
import JSZip from "./components/JSZip.vue";
</script>

<template>
  <JSZip />
  <!-- <LocalFileFullDownload /> -->
  <!-- <LocalFileDownload /> -->
  <!-- <SaveLocalFileDownload /> -->
  <LocalFileZip />
  <!-- <SavesLocalFIleZip /> -->
</template>

<style>
button {
  display: block;
  margin: 20px auto 0;
}
</style>