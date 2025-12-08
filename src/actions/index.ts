import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { and, db, eq, RiddleCollections, Riddles } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createRiddleCollection: defineAction({
    input: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      if (input.isDefault) {
        await db
          .update(RiddleCollections)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(RiddleCollections.userId, user.id));
      }

      const [collection] = await db
        .insert(RiddleCollections)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          isDefault: input.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { collection },
      };
    },
  }),

  updateRiddleCollection: defineAction({
    input: z.object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(RiddleCollections)
        .where(
          and(
            eq(RiddleCollections.id, input.id),
            eq(RiddleCollections.userId, user.id)
          )
        );

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Riddle collection not found.",
        });
      }

      const now = new Date();

      if (input.isDefault) {
        await db
          .update(RiddleCollections)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(RiddleCollections.userId, user.id));
      }

      const updateData: Partial<typeof RiddleCollections["$inferInsert"]> = {
        updatedAt: now,
      };

      if (typeof input.name !== "undefined") updateData.name = input.name;
      if (typeof input.description !== "undefined")
        updateData.description = input.description;
      if (typeof input.icon !== "undefined") updateData.icon = input.icon;
      if (typeof input.isDefault !== "undefined")
        updateData.isDefault = input.isDefault;

      const [collection] = await db
        .update(RiddleCollections)
        .set(updateData)
        .where(
          and(
            eq(RiddleCollections.id, input.id),
            eq(RiddleCollections.userId, user.id)
          )
        )
        .returning();

      return {
        success: true,
        data: { collection },
      };
    },
  }),

  deleteRiddleCollection: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(RiddleCollections)
        .where(
          and(
            eq(RiddleCollections.id, input.id),
            eq(RiddleCollections.userId, user.id)
          )
        );

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Riddle collection not found.",
        });
      }

      const now = new Date();

      await db
        .update(Riddles)
        .set({ collectionId: null, updatedAt: now })
        .where(
          and(
            eq(Riddles.collectionId, input.id),
            eq(Riddles.userId, user.id)
          )
        );

      await db
        .delete(RiddleCollections)
        .where(
          and(
            eq(RiddleCollections.id, input.id),
            eq(RiddleCollections.userId, user.id)
          )
        );

      return { success: true };
    },
  }),

  createRiddle: defineAction({
    input: z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      hint: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      category: z.string().optional(),
      language: z.string().optional(),
      collectionId: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.collectionId) {
        const [collection] = await db
          .select()
          .from(RiddleCollections)
          .where(
            and(
              eq(RiddleCollections.id, input.collectionId),
              eq(RiddleCollections.userId, user.id)
            )
          );

        if (!collection) {
          throw new ActionError({
            code: "FORBIDDEN",
            message: "Collection not found for this user.",
          });
        }
      }

      const now = new Date();

      const [riddle] = await db
        .insert(Riddles)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          collectionId: input.collectionId,
          question: input.question,
          answer: input.answer,
          hint: input.hint,
          difficulty: input.difficulty,
          category: input.category,
          language: input.language,
          isFavorite: input.isFavorite ?? false,
          isPublic: input.isPublic ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { riddle },
      };
    },
  }),

  updateRiddle: defineAction({
    input: z.object({
      id: z.string().min(1),
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      hint: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      category: z.string().optional(),
      language: z.string().optional(),
      collectionId: z.string().nullable().optional(),
      isFavorite: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(Riddles)
        .where(and(eq(Riddles.id, input.id), eq(Riddles.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Riddle not found.",
        });
      }

      if (typeof input.collectionId !== "undefined" && input.collectionId) {
        const [collection] = await db
          .select()
          .from(RiddleCollections)
          .where(
            and(
              eq(RiddleCollections.id, input.collectionId),
              eq(RiddleCollections.userId, user.id)
            )
          );

        if (!collection) {
          throw new ActionError({
            code: "FORBIDDEN",
            message: "Collection not found for this user.",
          });
        }
      }

      const updateData: Partial<typeof Riddles["$inferInsert"]> = {
        updatedAt: new Date(),
      };

      if (typeof input.question !== "undefined") updateData.question = input.question;
      if (typeof input.answer !== "undefined") updateData.answer = input.answer;
      if (typeof input.hint !== "undefined") updateData.hint = input.hint;
      if (typeof input.difficulty !== "undefined")
        updateData.difficulty = input.difficulty;
      if (typeof input.category !== "undefined") updateData.category = input.category;
      if (typeof input.language !== "undefined") updateData.language = input.language;
      if (typeof input.collectionId !== "undefined")
        updateData.collectionId = input.collectionId;
      if (typeof input.isFavorite !== "undefined")
        updateData.isFavorite = input.isFavorite;
      if (typeof input.isPublic !== "undefined")
        updateData.isPublic = input.isPublic;

      const [riddle] = await db
        .update(Riddles)
        .set(updateData)
        .where(and(eq(Riddles.id, input.id), eq(Riddles.userId, user.id)))
        .returning();

      return {
        success: true,
        data: { riddle },
      };
    },
  }),

  deleteRiddle: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(Riddles)
        .where(and(eq(Riddles.id, input.id), eq(Riddles.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Riddle not found.",
        });
      }

      await db
        .delete(Riddles)
        .where(and(eq(Riddles.id, input.id), eq(Riddles.userId, user.id)));

      return { success: true };
    },
  }),

  listMyCollections: defineAction({
    input: z.object({
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const items = await db
        .select()
        .from(RiddleCollections)
        .where(eq(RiddleCollections.userId, user.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        success: true,
        data: {
          items,
          total: items.length,
        },
      };
    },
  }),

  listMyRiddles: defineAction({
    input: z.object({
      collectionId: z.string().optional(),
      favoritesOnly: z.boolean().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      category: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const filters = [eq(Riddles.userId, user.id)];

      if (input.collectionId) {
        filters.push(eq(Riddles.collectionId, input.collectionId));
      }

      if (input.favoritesOnly) {
        filters.push(eq(Riddles.isFavorite, true));
      }

      if (input.difficulty) {
        filters.push(eq(Riddles.difficulty, input.difficulty));
      }

      if (input.category) {
        filters.push(eq(Riddles.category, input.category));
      }

      const whereClause = filters.length ? and(...filters) : undefined;

      const baseQuery = db
        .select()
        .from(Riddles)
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const query = whereClause ? baseQuery.where(whereClause) : baseQuery;

      const items = await query;

      return {
        success: true,
        data: {
          items,
          total: items.length,
        },
      };
    },
  }),
};
