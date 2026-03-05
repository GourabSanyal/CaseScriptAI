import { MMKV } from 'react-native-mmkv'
import { StateStorage } from 'zustand/middleware'

export const storage = new MMKV({ id: 'poc-storage' })

export const zustandMMKVStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value)
  },
  getItem: (name) => {
    const value = storage.getString(name)
    return value ?? null
  },
  removeItem: (name) => {
    storage.delete(name)
  },
}
