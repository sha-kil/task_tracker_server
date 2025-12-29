import z from "zod"

const UserBaseSchema = z.object({
  addressId: z.uuidv7().nullable().default(null),
  coverImageUrl: z.string().nullable().default(null),
  department: z.string().max(50).nullable().default(null),
  email: z.email().max(100),
  firstName: z.string().max(50),
  homePhone: z.string().nullable().default(null),
  id: z.uuidv7(),
  lastActive: z.iso.datetime().default(() => new Date().toISOString()),
  lastName: z.string().max(50),
  organization: z.string().max(100).nullable().default(null),
  password: z.string().min(8).max(100),
  position: z.string().max(100).nullable().default(null),
  profilePictureUrl: z.string().nullable().default(null),
  teamId: z.uuidv7().nullable().default(null),
  workPhone: z.string().nullable().default(null),
})

export const UserGETSchema = UserBaseSchema.omit({ password: true })

export const UserCreateSchema = UserBaseSchema.omit({ id: true })

export const UserPUTSchema = UserBaseSchema.omit({
  id: true,
  password: true,
  email: true,
})
  .partial()
  .transform((data) => ({
    ...(data.addressId !== undefined && { addressId: data.addressId }),
    ...(data.coverImageUrl !== undefined && {
      coverImageUrl: data.coverImageUrl,
    }),
    ...(data.department !== undefined && { department: data.department }),
    ...(data.firstName !== undefined && { firstName: data.firstName }),
    ...(data.homePhone !== undefined && { homePhone: data.homePhone }),
    ...(data.lastName !== undefined && { lastName: data.lastName }),
    ...(data.lastActive !== undefined && { lastActive: data.lastActive }),
    ...(data.organization !== undefined && { organization: data.organization }),
    ...(data.position !== undefined && { position: data.position }),
    ...(data.profilePictureUrl !== undefined && {
      profilePictureUrl: data.profilePictureUrl,
    }),
    ...(data.workPhone !== undefined && { workPhone: data.workPhone }),
  }))
