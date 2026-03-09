import { useState } from 'react'
import {
  Button,
  Checkbox,
  Field,
  HStack,
  Input,
  NativeSelect,
  Slider,
  Stack,
  Textarea,
  Text,
} from '@chakra-ui/react'
import type {
  WardrobeCategory,
  WarmthLevel,
  WaterproofLevel,
  WardrobeItemInput,
} from '../../types/wardrobe'

export type ItemFormValues = Omit<
  WardrobeItemInput,
  'photoUrl' | 'sourceUrl' | 'extractedByAI'
>

interface ItemFormProps {
  defaultValues?: Partial<ItemFormValues>
  onSubmit: (values: ItemFormValues) => Promise<void>
  isLoading: boolean
  submitLabel?: string
}

const DEFAULT_VALUES: ItemFormValues = {
  name: '',
  category: 'jacket',
  color: '',
  material: '',
  brand: '',
  warmthLevel: 3,
  waterproof: 'no',
  windproof: false,
  temperatureRange: { min: -10, max: 10 },
  notes: '',
}

const CATEGORIES: { value: WardrobeCategory; label: string }[] = [
  { value: 'jacket', label: 'Jacket' },
  { value: 'sweater', label: 'Sweater' },
  { value: 'fleece', label: 'Fleece' },
  { value: 'base-layer', label: 'Base Layer' },
  { value: 'trousers', label: 'Trousers' },
  { value: 'hat', label: 'Hat' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'scarf', label: 'Scarf' },
  { value: 'other', label: 'Other' },
]

const WARMTH_LABELS: Record<WarmthLevel, string> = {
  1: '1 — Ultralight summer',
  2: '2 — Light spring/fall',
  3: '3 — Moderate cold',
  4: '4 — Cold winter',
  5: '5 — Extreme cold',
}

export function ItemForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_VALUES,
    ...defaultValues,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormValues, string>>>({})

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ItemFormValues, string>> = {}
    if (!values.name.trim()) newErrors.name = 'Name is required'
    if (!values.category) newErrors.category = 'Category is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={5}>
        <Field.Root required invalid={!!errors.name}>
          <Field.Label>
            Name <Field.RequiredIndicator />
          </Field.Label>
          <Input
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Norrøna Gore-Tex Jacket"
          />
          {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
        </Field.Root>

        <Field.Root required invalid={!!errors.category}>
          <Field.Label>
            Category <Field.RequiredIndicator />
          </Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={values.category}
              onChange={(e) => set('category', e.target.value as WardrobeCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {errors.category && <Field.ErrorText>{errors.category}</Field.ErrorText>}
        </Field.Root>

        <HStack gap={4}>
          <Field.Root flex={1}>
            <Field.Label>Brand</Field.Label>
            <Input
              value={values.brand}
              onChange={(e) => set('brand', e.target.value)}
              placeholder="e.g. Norrøna"
            />
          </Field.Root>
          <Field.Root flex={1}>
            <Field.Label>Color</Field.Label>
            <Input
              value={values.color}
              onChange={(e) => set('color', e.target.value)}
              placeholder="e.g. Navy Blue"
            />
          </Field.Root>
        </HStack>

        <Field.Root>
          <Field.Label>Material / Fabric</Field.Label>
          <Input
            value={values.material}
            onChange={(e) => set('material', e.target.value)}
            placeholder="e.g. Gore-Tex 3-layer"
          />
        </Field.Root>

        <Field.Root>
          <HStack justify="space-between" mb={2}>
            <Field.Label mb={0}>Warmth Level</Field.Label>
            <Text fontSize="sm" color="fg.muted">
              {WARMTH_LABELS[values.warmthLevel]}
            </Text>
          </HStack>
          <Slider.Root
            min={1}
            max={5}
            step={1}
            value={[values.warmthLevel]}
            onValueChange={(e) => set('warmthLevel', e.value[0] as WarmthLevel)}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
            <Slider.Marks marks={[1, 2, 3, 4, 5]} />
          </Slider.Root>
        </Field.Root>

        <HStack gap={4}>
          <Field.Root flex={1}>
            <Field.Label>Waterproof</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={values.waterproof}
                onChange={(e) => set('waterproof', e.target.value as WaterproofLevel)}
              >
                <option value="no">No</option>
                <option value="water-resistant">Water-resistant</option>
                <option value="yes">Yes (fully waterproof)</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root flex={1} pt={6}>
            <Checkbox.Root
              checked={values.windproof}
              onCheckedChange={(e) => set('windproof', !!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Windproof</Checkbox.Label>
            </Checkbox.Root>
          </Field.Root>
        </HStack>

        <Field.Root>
          <Field.Label>Temperature Range (°C)</Field.Label>
          <HStack gap={3}>
            <Input
              type="number"
              value={values.temperatureRange.min}
              onChange={(e) =>
                set('temperatureRange', {
                  ...values.temperatureRange,
                  min: Number(e.target.value),
                })
              }
              placeholder="Min"
              maxW="100px"
            />
            <Text color="fg.muted">to</Text>
            <Input
              type="number"
              value={values.temperatureRange.max}
              onChange={(e) =>
                set('temperatureRange', {
                  ...values.temperatureRange,
                  max: Number(e.target.value),
                })
              }
              placeholder="Max"
              maxW="100px"
            />
          </HStack>
          <Field.HelperText>
            Comfortable temperature range for this item
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Notes</Field.Label>
          <Textarea
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional details about this item..."
            rows={3}
          />
        </Field.Root>

        <Button type="submit" colorPalette="blue" loading={isLoading} alignSelf="flex-start">
          {submitLabel}
        </Button>
      </Stack>
    </form>
  )
}
