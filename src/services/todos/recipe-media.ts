import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  PendingTodoMutation,
  TodoRecipe,
  TodoSharedSnapshot,
} from '@/store/todos';

const BUCKET = 'todo-recipe-images';
const MARKER = 'ontrack-todo-recipe-media:';

function extensionAndType(uri: string) {
  const match = /\.(png|webp|jpe?g)(?:$|[?#])/i.exec(uri);
  const extension = match?.[1]?.toLocaleLowerCase();
  if (extension === 'png') return { extension: 'png', contentType: 'image/png' };
  if (extension === 'webp') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return { extension: 'jpg', contentType: 'image/jpeg' };
}

async function imageBytes(uri: string) {
  if (Platform.OS !== 'web' && uri.startsWith('file://')) {
    return new File(uri).arrayBuffer();
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error('The recipe thumbnail could not be read.');
  return response.arrayBuffer();
}

export function recipeMediaPath(value?: string) {
  return value?.startsWith(MARKER) ? value.slice(MARKER.length) : undefined;
}

export async function uploadSharedRecipeImage(
  client: SupabaseClient,
  recipe: TodoRecipe,
) {
  const uri = recipe.sourceImageUri;
  if (recipe.sourceImagePath) return recipe.sourceImagePath;
  if (!uri) return undefined;
  const existing = recipeMediaPath(uri);
  if (existing) return existing;
  const { extension, contentType } = extensionAndType(uri);
  const path = `${recipe.listId}/${recipe.id}.${extension}`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, await imageBytes(uri), {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });
  if (error) throw error;
  return path;
}

export async function prepareRecipeMutationMedia(
  client: SupabaseClient,
  mutation: PendingTodoMutation,
) {
  if (mutation.operation === 'clear_completed') {
    const deletedRecipes = Array.isArray(mutation.payload.deletedRecipes)
      ? mutation.payload.deletedRecipes
      : [];
    const candidates = deletedRecipes.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const recipe = value as { id?: unknown; sourceImagePath?: unknown };
      if (typeof recipe.sourceImagePath === 'string') {
        return [recipe.sourceImagePath];
      }
      if (typeof recipe.id !== 'string') return [];
      return ['jpg', 'png', 'webp'].map(
        (extension) => `${mutation.listId}/${recipe.id}.${extension}`,
      );
    });
    if (candidates.length) {
      await client.storage
        .from(BUCKET)
        .remove(candidates)
        .catch(() => undefined);
    }
    return mutation;
  }
  if (mutation.operation === 'delete_recipe') {
    const recipeId =
      typeof mutation.payload.recipeId === 'string'
        ? mutation.payload.recipeId
        : undefined;
    const path =
      typeof mutation.payload.sourceImagePath === 'string'
        ? mutation.payload.sourceImagePath
        : undefined;
    const candidates = path
      ? [path]
      : recipeId
        ? ['jpg', 'png', 'webp'].map(
            (extension) => `${mutation.listId}/${recipeId}.${extension}`,
          )
        : [];
    if (candidates.length) {
      await client.storage
        .from(BUCKET)
        .remove(candidates)
        .catch(() => undefined);
    }
    return mutation;
  }
  if (mutation.operation !== 'add_recipe') return mutation;
  const recipe =
    mutation.payload.recipe &&
    typeof mutation.payload.recipe === 'object' &&
    !Array.isArray(mutation.payload.recipe)
      ? (mutation.payload.recipe as TodoRecipe)
      : undefined;
  if (!recipe?.sourceImageUri) return mutation;
  return {
    ...mutation,
    payload: {
      ...mutation.payload,
      recipe: {
        ...recipe,
        sourceImagePath: await uploadSharedRecipeImage(client, recipe),
      },
    },
  };
}

export async function resolveSharedRecipeMedia(
  client: SupabaseClient,
  snapshot: TodoSharedSnapshot,
): Promise<TodoSharedSnapshot> {
  const recipes = await Promise.all(
    (snapshot.recipes ?? []).map(async (recipe) => {
      const path = recipeMediaPath(recipe.sourceImageUri);
      const storedPath = recipe.sourceImagePath ?? path;
      if (!storedPath) return recipe;
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(storedPath, 60 * 60);
      if (error || !data?.signedUrl) {
        return { ...recipe, sourceImageUri: undefined, sourceImagePath: storedPath };
      }
      return {
        ...recipe,
        sourceImageUri: data.signedUrl,
        sourceImagePath: storedPath,
      };
    }),
  );
  return { ...snapshot, recipes };
}

export async function removeSharedRecipeImages(
  client: SupabaseClient,
  recipes: TodoRecipe[],
) {
  const candidates = recipes.flatMap((recipe) => {
    const path = recipe.sourceImagePath ?? recipeMediaPath(recipe.sourceImageUri);
    if (path) return [path];
    return ['jpg', 'png', 'webp'].map(
      (extension) => `${recipe.listId}/${recipe.id}.${extension}`,
    );
  });
  if (!candidates.length) return;
  const { error } = await client.storage.from(BUCKET).remove(candidates);
  if (error) throw error;
}
