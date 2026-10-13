import { flushPromises, mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import QSchemaWizard from '../../src/components/QSchemaWizard.vue'
import { veeValidateAdapter } from '../../src/adapters/vee-validate'
import type { WizardActions } from '../../src/types'

const settle = async () => { await flushPromises(); await nextTick() }
const actions = (wrapper: { vm: unknown }) => wrapper.vm as WizardActions
describe.each([['native', undefined], ['vee-validate', veeValidateAdapter]] as const)('wizard server values with %s state', (_name, stateAdapter) => {
  it('blocks programmatic forward navigation during loading and allows it after the data arrives', async () => {
    let finish!: (values: { email: string; name: string }) => void
    const request = new Promise<{ email: string; name: string }>((resolve) => { finish = resolve })
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { stateAdapter,
      steps: [{ key: 'account', label: 'Account' }, { key: 'profile', label: 'Profile' }],
      initialValues: { email: '', name: '' }, fields: { email: { type: 'input', step: 'account' }, name: { type: 'input', step: 'profile' } },
    } })
    const api = actions(wrapper)
    const loading = api.loadValues(() => request)
    await settle()
    expect(api.loadingValues).toBe(true)
    expect(await api.nextStep()).toBe(false)
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Account')
    finish({ email: 'loaded@example.com', name: 'Loaded name' })
    expect(await loading).toBe(true)
    await settle()
    expect(api.loadingValues).toBe(false)
    expect(await api.nextStep()).toBe(true)
    await settle()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Profile')
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Loaded name')
    wrapper.unmount()
  })

  it('forwards loading, patching, server errors and reset baselines across steps', async () => {
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { stateAdapter,
      steps: [{ key: 'account', label: 'Account' }, { key: 'profile', label: 'Profile' }],
      initialValues: { email: '', name: '' }, fields: { email: { type: 'input', step: 'account' }, name: { type: 'input', step: 'profile' } },
    }, slots: { default: (scope: { values: unknown; errors: unknown; dirty: boolean }) => h('output', JSON.stringify({ values: scope.values, errors: scope.errors, dirty: scope.dirty })) } })
    const api = actions(wrapper)
    expect(await api.loadValues(() => ({ email: 'loaded@example.com', name: 'Loaded name' }))).toBe(true)
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="email"]').element.value).toBe('loaded@example.com')
    expect(await api.nextStep()).toBe(true)
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Loaded name')
    api.setValues({ name: 'Patched name' })
    api.applyServerResponse({ errors: { name: 'Choose another name', '': 'Server declined' } })
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Patched name')
    expect(wrapper.text()).toContain('Choose another name')
    expect(wrapper.text()).toContain('Server declined')
    api.reset()
    await settle()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Account')
    expect(JSON.parse(wrapper.get('output').text())).toMatchObject({ values: { email: 'loaded@example.com', name: 'Loaded name' }, errors: {}, dirty: false })
    api.reset({ email: 'reset@example.com', name: 'Reset name' })
    api.setValues({ email: 'changed@example.com' })
    api.reset()
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="email"]').element.value).toBe('reset@example.com')
    wrapper.unmount()
  })
})
