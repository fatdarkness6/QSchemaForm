<script setup lang="ts">
import { ref } from "vue";
import { QBtn } from "quasar";
import { QSchemaForm, defineFields } from "q-schema-form";
import { zodAdapter } from "q-schema-form/zod";
import { isValidPhoneNumber } from "q-schema-form/phone";
import { z } from "zod";
import { locale } from "../localization";

const schema = zodAdapter(
  z.object({
    email: z.string().email("invalidEmail"),
    age: z.number().min(18, "Minimum age is 18"),
    role: z.enum(["user", "admin"]),
    phone: z
      .string()
      .refine((value) => isValidPhoneNumber(value), "invalidPhone"),
    active: z.boolean(),
    notifications: z.boolean(),
    profile: z.object({
      city: z.string().min(1, "required"),
      biography: z.string(),
    }),
  }),
);
const form = ref({
  email: "",
  age: 18,
  role: "user" as "user" | "admin",
  active: true,
  phone: "",
  notifications: false,
  profile: { city: "", biography: "" },
});
const fields = defineFields<typeof form.value>()({
  email: {
    type: "input",
    label: "email",
    props: { type: "email" },
    class: "col-12 col-sm-6",
  },
  phone: {
    type: "phone",
    label: "phone",
    hint: "phoneHint",
    props: { defaultCountry: "IR", placeholder: "912 123 4567" },
    class: "col-12",
  },
  age: { type: "number", label: "age", class: "col-12 col-sm-6" },
  role: { type: "select", label: "role", class: "col-12 col-sm-6" },
  active: { type: "checkbox", label: "active", class: "col-12 col-sm-6" },
  notifications: { type: "toggle", label: "notifications" },
  "profile.city": { type: "input", label: "city", section: "profile" },
  "profile.biography": {
    type: "textarea",
    label: "biography",
    section: "profile",
  },
});
const saved = ref("No submission yet.");
async function save(value: typeof form.value) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  saved.value = JSON.stringify(value, null, 2);
}
</script>

<template>
  <QSchemaForm
    v-model="form"
    :schema="schema"
    :fields="fields"
    :sections="[{ key: 'profile', label: 'Profile', defaultOpened: false }]"
    :direction="locale === 'fa' ? 'rtl' : 'ltr'"
    :format-validation-message="(issue, t) => t(issue.message)"
    :submit-action="save"
  >
    <template #default="{ reset, dirty, submitting }">
      <div class="row items-center q-gutter-sm q-mt-md">
        <QBtn
          type="submit"
          color="primary"
          label="Save profile"
          :loading="submitting"
        />
        <QBtn label="Reset" flat :disable="submitting" @click="reset" />
        <span class="text-grey-7">{{
          dirty ? "Unsaved changes" : "Unchanged"
        }}</span>
      </div>
    </template>
  </QSchemaForm>
  <pre class="result">{{ saved }}</pre>
</template>
