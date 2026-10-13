<script setup lang="ts">
import { version } from "q-schema-form";
import { ref } from "vue";
import { QBtn, QTab, QTabs, QTabPanel, QTabPanels } from "quasar";
import { locale } from "./localization";
import ZodExample from "./examples/ZodExample.vue";
import YupExample from "./examples/YupExample.vue";
import CustomExample from "./examples/CustomExample.vue";
import LegacyExample from "./examples/LegacyExample.vue";

const tab = ref("zod");
</script>

<template>
  <main class="playground q-pa-lg">
    <header class="row items-center justify-between q-mb-lg">
      <div>
        <p class="text-overline text-primary q-mb-xs">
          VUE + QUASAR · v{{ version }}
        </p>
        <h1 class="text-h4 q-my-sm">Forms from your schemas.</h1>
        <p class="text-grey-7">
          Validation, localization, and reusable fields — one public API.
        </p>
      </div>
      <QBtn
        outline
        color="primary"
        :label="locale === 'en' ? 'فارسی' : 'English'"
        @click="locale = locale === 'en' ? 'fa' : 'en'"
      />
    </header>
    <section class="example-card">
      <QTabs v-model="tab" align="left" active-color="primary" narrow-indicator>
        <QTab name="zod" label="Zod + nested fields" /><QTab
          name="yup"
          label="Yup + VeeValidate"
        /><QTab name="custom" label="Custom fields" /><QTab
          name="legacy"
          label="Migration"
        />
      </QTabs>
      <QTabPanels v-model="tab" animated>
        <QTabPanel name="zod"><ZodExample /></QTabPanel><QTabPanel name="yup"><YupExample /></QTabPanel><QTabPanel name="custom"><CustomExample /></QTabPanel><QTabPanel name="legacy"><LegacyExample /></QTabPanel>
      </QTabPanels>
    </section>
    <p class="text-caption text-grey-7 q-mt-md">
      Examples import the built package through q-schema-form and its public
      adapter exports.
    </p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #f4f6fa;
  color: #1d2940;
}
.playground {
  max-width: 1000px;
  margin: 32px auto;
}
.example-card {
  background: white;
  border: 1px solid #dde3ec;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px #25385808;
}
.q-tab-panel {
  padding: 28px;
}
.result {
  padding: 16px;
  margin-top: 24px;
  background: #f5f7fb;
  border-radius: 8px;
  overflow: auto;
  font-size: 13px;
}
</style>
