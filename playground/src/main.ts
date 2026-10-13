import { createApp } from 'vue'
import { Quasar } from 'quasar'
import 'quasar/dist/quasar.css'
import '@quasar/extras/material-icons/material-icons.css'
import App from './App.vue'
import { createQSchemaForm } from 'q-schema-form'
import { translate } from './localization'
import PhoneField from './examples/PhoneField.vue'

const forms = createQSchemaForm({ translate, defaultFieldProps: { outlined: true, dense: true } })
forms.registerField('phone', PhoneField)
createApp(App).use(Quasar).use(forms).mount('#app')
