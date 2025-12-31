import { UserRole } from "@prismaClient/enums.js"
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
  role: z.enum(UserRole).default(UserRole.USER),
  teamId: z.uuidv7().nullable().default(null),
  workPhone: z.string().nullable().default(null),
})

const UserBaseSchemaWithoutDefault = UserBaseSchema.omit({
  addressId: true,
  coverImageUrl: true,
  department: true,
  homePhone: true,
  organization: true,
  position: true,
  profilePictureUrl: true,
  teamId: true,
  workPhone: true,
}).extend({
  addressId: UserBaseSchema.shape.addressId.unwrap(),
  coverImageUrl: UserBaseSchema.shape.coverImageUrl.unwrap(),
  department: UserBaseSchema.shape.department.unwrap(),
  homePhone: UserBaseSchema.shape.homePhone.unwrap(),
  organization: UserBaseSchema.shape.organization.unwrap(),
  position: UserBaseSchema.shape.position.unwrap(),
  profilePictureUrl: UserBaseSchema.shape.profilePictureUrl.unwrap(),
  role: UserBaseSchema.shape.role.unwrap(),
  teamId: UserBaseSchema.shape.teamId.unwrap(),
  workPhone: UserBaseSchema.shape.workPhone.unwrap(),
})

export const UserGETSchema = UserBaseSchema.omit({ password: true })

export const UserCreateSchema = UserBaseSchema.omit({ id: true })

export const UserPATCHSchema = UserBaseSchemaWithoutDefault.omit({
  id: true,
  password: true,
  email: true,
}).partial()
