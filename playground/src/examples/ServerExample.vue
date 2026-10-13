<script setup lang="ts">
import { ref } from "vue";
import { QBtn } from "quasar";
import { QSchemaForm, defineFields, required } from "q-schema-form";
import type { FormActions, ServerResponse, SubmitContext } from "q-schema-form";

interface Profile extends Record<string, unknown> {
  name: string;
  email: string;
  age: number;
  active: boolean;
  birthday: string;
  country: string;
  city: string;
  biography: string;
}
const model = ref<Profile>({
  name: "",
  email: "",
  age: 18,
  active: false,
  birthday: "",
  country: "ir",
  city: "",
  biography: "",
});
const form = ref<FormActions<Profile>>();
const status = ref("");
const response = ref("");

// A simulated API makes this demo runnable without a backend. Replace these
// functions with fetch/Axios calls and map your API data into the form model.
function delay(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 700);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
async function profile(
  id: "ada" | "grace" | "fail",
  signal: AbortSignal,
): Promise<Profile> {
  await delay(signal);
  if (id === "fail")
    throw new Error("The profile service is unavailable. Try loading again.");
  return id === "ada"
    ? {
        name: "Ada",
        email: "ada@example.com",
        age: 30,
        active: true,
        birthday: "1996-05-12",
        country: "uk",
        city: "London",
        biography: "Loaded from the profile service.",
      }
    : {
        name: "Grace",
        email: "grace@example.com",
        age: 35,
        active: false,
        birthday: "1991-07-20",
        country: "ir",
        city: "Tehran",
        biography: "A different server record.",
      };
}
const cities: Record<string, string[]> = {
  ir: ["Tehran", "Shiraz", "Isfahan"],
  uk: ["London", "Manchester", "Bristol"],
};
const fields = defineFields<Profile>()({
  name: { type: "input", label: "Name", validate: required() },
  email: {
    type: "input",
    label: "Email",
    props: { type: "email" },
    validate: required(),
  },
  age: { type: "number", label: "Age", props: { min: 18, max: 120 } },
  birthday: { type: "date", label: "Birthday" },
  active: { type: "checkbox", label: "Active account" },
  country: {
    type: "select",
    label: "Country",
    options: [
      { label: "Iran", value: "ir" },
      { label: "United Kingdom", value: "uk" },
    ],
  },
  city: {
    type: "select",
    label: "City — search the server",
    dependencies: ["country"],
    props: ({ values }) => ({
      useInput: true,
      inputDebounce: 250,
      clearable: true,
      disable: !values.country,
    }),
    options: async ({ values, query = "" }, signal) => {
      await delay(signal);
      return (cities[values.country] ?? [])
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .map((city) => ({ label: city, value: city }));
    },
  },
  biography: {
    type: "textarea",
    label: "Biography",
    props: ({ values }) => ({
      rows: values.active ? 4 : 2,
      placeholder: values.active
        ? "Tell us about this active account"
        : "Optional notes",
    }),
  },
});
async function load(id: "ada" | "grace" | "fail") {
  status.value = "";
  try {
    const applied = await form.value!.loadValues(({ signal }) =>
      profile(id, signal),
    );
    if (applied)
      status.value = "Server values loaded. Your edits were preserved.";
  } catch {
    /* loadError in the form slot displays the failure and permits retry. */
  }
}
async function save(values: Profile, context: SubmitContext<Profile>) {
  status.value = "";
  await delay();
  const reply: ServerResponse<Profile> =
    values.email === "taken@example.com"
      ? {
          errors: {
            email: "This email is already registered.",
            "": "The server rejected this submission.",
          },
        }
      : {
          values: {
            ...values,
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
          },
          errors: {},
        };
  response.value = JSON.stringify(reply, null, 2);
  context.applyServerResponse(reply, { asInitial: true });
  status.value =
    reply.errors && Object.keys(reply.errors).length
      ? "Review the server errors below the inputs."
      : "Saved. Server-normalized values are now in the form.";
}
function fieldChange(event: { path: string }) {
  if (event.path === "country") form.value!.setFieldValue("city", "");
}
</script>

<template>
  <p>
    This demo simulates server requests. Edit a field while a profile loads:
    your edit stays. Search cities, or enter
    <strong>taken@example.com</strong> to see server validation errors.
  </p>
  <QSchemaForm
    ref="form"
    v-model="model"
    :fields="fields"
    :submit-action="save"
    :default-field-props="{ outlined: true, dense: true }"
    @field-change="fieldChange"
  >
    <template
      #default="{
        loadingValues,
        loadError,
        submitting,
        dirty,
        reset,
        cancelLoad,
      }"
    >
      <div class="row q-gutter-sm q-mt-md">
        <QBtn
          type="button"
          outline
          label="Load Ada"
          :disable="submitting"
          @click="load('ada')"
        />
        <QBtn
          type="button"
          outline
          label="Load Grace"
          :disable="submitting"
          @click="load('grace')"
        />
        <QBtn
          type="button"
          outline
          label="Simulate load failure"
          :disable="submitting"
          @click="load('fail')"
        />
        <QBtn
          v-if="loadingValues"
          type="button"
          flat
          label="Cancel load"
          @click="cancelLoad"
        />
        <QBtn
          type="submit"
          color="primary"
          label="Save to server"
          :loading="submitting"
          :disable="loadingValues"
        />
        <QBtn
          type="button"
          flat
          label="Reset"
          :disable="submitting"
          @click="reset"
        />
      </div>
      <p v-if="loadingValues" role="status" class="q-mt-md">
        Loading values… You can keep editing.
      </p>
      <p v-if="loadError" role="alert" class="text-negative q-mt-md">
        {{ loadError instanceof Error ? loadError.message : String(loadError) }}
      </p>
      <p v-if="status" role="status" class="q-mt-md">{{ status }}</p>
      <p class="text-caption">
        {{ dirty ? "Unsaved changes" : "Matches the reset baseline" }}
      </p>
    </template>
  </QSchemaForm>
  <p class="text-subtitle2 q-mt-lg">Current form values</p>
  <pre class="result">{{ JSON.stringify(model, null, 2) }}</pre>
  <p v-if="response" class="text-subtitle2">Last server response</p>
  <pre v-if="response" class="result">{{ response }}</pre>
</template>
