import z from "zod"

export const AddressGETSchema = z.object({
  apartmentNumber: z.string().nullable(),
  city: z.string(),
  country: z.string(),
  houseNumber: z.string(),
  id: z.uuidv7(),
  state: z.string(),
  street: z.string(),
  zipCode: z.string(),
})

export const AddressCreateSchema = AddressGETSchema.omit({
  id: true,
}).extend({
  userId: z.uuidv7(),
})
