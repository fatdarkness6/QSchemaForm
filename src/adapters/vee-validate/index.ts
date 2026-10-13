import { computed, shallowRef } from "vue";
import { useForm } from "vee-validate";
import type {
  ErrorMap,
  FormStateAdapter,
  FormValues,
} from "../../types/index.js";
import { cloneValue, equalValues } from "../../utils/values.js";
import { pathSegments } from '../../utils/paths.js';

const veePath = (path: string) => pathSegments(path).reduce<string>((result, segment) => typeof segment === 'number' ? `${result}[${segment}]` : `${result}${result ? '.' : ''}${segment}`, '');

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
  const setTouched = (path: string) => {
    if (!paths.value.includes(path)) {
      form.defineField(veePath(path), { validateOnModelUpdate: false, validateOnBlur: false, validateOnChange: false, validateOnInput: false });
      paths.value = [...paths.value, path];
    }
    form.setFieldTouched(path, true);
  };
  return {
    values: computed(() => form.values),
    errors: computed(
      () =>
        Object.fromEntries(
          Object.entries(form.errorBag.value).filter(
            (entry) => entry[1]?.length,
          ).map(([path, messages]) => [pathSegments(path).join('.'), messages]),
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
            paths.value.map((path) => [veePath(path), form.isFieldTouched(path)]),
          ),
          errors: { ...form.errors.value },
        },
        { force: true },
      );
      setErrors(errors);
    },
    setTouched,
    replaceTouched(next) {
      form.setTouched(Object.fromEntries(paths.value.map((path) => [path, false])));
      for (const [path, touched] of Object.entries(next)) if (touched) setTouched(path);
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
