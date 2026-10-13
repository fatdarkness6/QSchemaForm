import { computed, shallowRef } from "vue";
import { useForm } from "vee-validate";
import type {
  ErrorMap,
  FormStateAdapter,
  FormValues,
} from "../../types/index.js";
import { cloneValue, equalValues } from "../../utils/values.js";

/** Optional VeeValidate state ownership. The form engine supplies validation results. */
export const veeValidateAdapter: FormStateAdapter = (initialValues) => {
  const form = useForm<FormValues>({
    initialValues: cloneValue(initialValues),
    validateOnMount: false,
  });
  const baseline = shallowRef(cloneValue(initialValues));
  const paths = shallowRef<string[]>([]);
  const setErrors = (errors: ErrorMap) =>
    form.setErrors(
      Object.fromEntries([
        ...Object.keys(form.errorBag.value).map((key) => [key, undefined]),
        ...Object.entries(errors).map(([key, messages]) => [
          key,
          [...messages],
        ]),
      ]),
    );
  return {
    values: computed(() => form.values),
    errors: computed(
      () =>
        Object.fromEntries(
          Object.entries(form.errorBag.value).filter(
            (entry) => entry[1]?.length,
          ),
        ) as ErrorMap,
    ),
    touched: computed(() =>
      Object.fromEntries(
        paths.value
          .filter((path) => form.isFieldTouched(path))
          .map((path) => [path, true]),
      ),
    ),
    dirty: computed(() => !equalValues(form.values, baseline.value)),
    replaceValues(values) {
      const errors = Object.fromEntries(
        Object.entries(form.errorBag.value).filter((entry) => entry[1]?.length),
      ) as ErrorMap;
      // setValues merges; resetForm(force) also removes keys deleted by the parent.
      form.resetForm(
        {
          values: cloneValue(values),
          touched: Object.fromEntries(
            paths.value.map((path) => [path, form.isFieldTouched(path)]),
          ),
          errors: { ...form.errors.value },
        },
        { force: true },
      );
      setErrors(errors);
    },
    setTouched(path) {
      if (!paths.value.includes(path)) {
        form.defineField(path, {
          validateOnModelUpdate: false,
          validateOnBlur: false,
          validateOnChange: false,
          validateOnInput: false,
        });
        paths.value = [...paths.value, path];
      }
      form.setFieldTouched(path, true);
    },
    setErrors,
    reset(values) {
      if (values) baseline.value = cloneValue(values);
      setErrors({});
      form.resetForm(
        { values: cloneValue(baseline.value), errors: {}, touched: {} },
        { force: true },
      );
    },
  };
};
