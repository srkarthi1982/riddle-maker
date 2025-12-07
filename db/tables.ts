/**
 * Riddle Maker - create, store, and categorize riddles.
 *
 * Design goals:
 * - Riddle collections (themed sets).
 * - Each riddle has question + answer + difficulty.
 */

import { defineTable, column, NOW } from "astro:db";

export const RiddleCollections = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                              // "Kids riddles", "Logic puzzles"
    description: column.text({ optional: true }),
    icon: column.text({ optional: true }),
    isDefault: column.boolean({ default: false }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Riddles = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    collectionId: column.text({
      references: () => RiddleCollections.columns.id,
      optional: true,
    }),
    userId: column.text(),

    question: column.text(),                          // riddle text
    answer: column.text(),                            // solution
    hint: column.text({ optional: true }),
    difficulty: column.text({ optional: true }),      // "easy", "medium", "hard"
    category: column.text({ optional: true }),        // "wordplay", "math", etc.
    language: column.text({ optional: true }),

    isFavorite: column.boolean({ default: false }),
    isPublic: column.boolean({ default: false }),     // future: sharing

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  RiddleCollections,
  Riddles,
} as const;
