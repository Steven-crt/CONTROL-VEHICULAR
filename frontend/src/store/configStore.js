import { create } from 'zustand'

const useConfigStore = create(() => ({
  companyName: 'Control Vehicular',
  currency: 'Q',
  currencyName: 'Quetzales'
}))

export default useConfigStore
