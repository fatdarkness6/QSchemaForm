<script setup lang="ts">
import { computed, ref } from "vue";
import { QBtn, QToggle } from "quasar";
import { QSchemaForm } from "q-schema-form";
import { yupAdapter } from "q-schema-form/yup";
import { veeValidateAdapter } from "q-schema-form/vee-validate";
import * as yup from "yup";
import { locale, translate } from "../localization";

const schema = computed(() =>
  yupAdapter(
    yup.object({
      name: yup.string().required(translate("required")).label("name"),
      email: yup
        .string()
        .email(translate("invalidEmail"))
        .required(translate("required"))
        .label("email")
        .meta({ type: "email" }),
    }),
  ),
);
const form = ref({ name: "", email: "" });
const disabled = ref(false);
const result = ref("");
</script>

<template>
  <p>
    Fields come from Yup labels and metadata. VeeValidate owns this form's
    state.
  </p>
  <QToggle v-model="disabled" label="Disable form" class="q-mb-md" />
  <QSchemaForm
    v-model="form"
    :schema="schema"
    :state-adapter="veeValidateAdapter"
    :disabled="disabled"
    :direction="locale === 'fa' ? 'rtl' : 'ltr'"
    @submit="result = JSON.stringify($event, null, 2)"
  >
    <template #default="{ reset }">
      <div class="q-gutter-sm q-mt-md">
        <QBtn
          type="submit"
          label="Submit"
          color="primary"
          :disable="disabled"
        /><QBtn label="Reset" flat @click="reset" />
      </div>
    </template>
  </QSchemaForm>
  <pre v-if="result" class="result">{{ result }}</pre>
</template>
