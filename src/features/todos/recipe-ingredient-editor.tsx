import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Input, SectionHeader, Symbol } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeImportIngredient } from '@/services/recipes';
import { canonicalIngredientKey } from '@/store/todos';
import { parseQuantityText } from '@/features/todos/grocery-utils';

export type EditableRecipeIngredient = RecipeImportIngredient & { id: string };

export function RecipeIngredientEditor({
  ingredients,
  onChange,
  onAdd,
}: {
  ingredients: EditableRecipeIngredient[];
  onChange: (ingredients: EditableRecipeIngredient[]) => void;
  onAdd: () => void;
}) {
  const theme = useTheme();

  const updateIngredient = (
    id: string,
    patch: Partial<EditableRecipeIngredient>,
  ) => {
    onChange(
      ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, ...patch } : ingredient,
      ),
    );
  };

  return (
    <View style={styles.ingredientSection}>
      <View style={styles.ingredientHeading}>
        <SectionHeader title={`${ingredients.length} ingredients`} />
        <Button variant="ghost" onPress={onAdd}>
          Add row
        </Button>
      </View>
      {ingredients.map((ingredient, index) => (
        <Card key={ingredient.id} style={styles.ingredientCard}>
          <View style={styles.ingredientCardHeader}>
            <AppText variant="overline" color="tertiary">
              Ingredient {index + 1}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ingredient ${index + 1}`}
              onPress={() =>
                onChange(ingredients.filter((item) => item.id !== ingredient.id))
              }>
              <Symbol name="delete" size={18} color={theme.danger} />
            </Pressable>
          </View>
          <Input
            label="Ingredient"
            value={ingredient.name}
            maxLength={100}
            onChangeText={(value) =>
              updateIngredient(ingredient.id, {
                name: value,
                canonicalKey: canonicalIngredientKey(value),
              })
            }
          />
          <View style={styles.servingRow}>
            <View style={styles.flex}>
              <Input
                label="Amount"
                value={ingredient.quantityText ?? ''}
                maxLength={40}
                placeholder="2 or to taste"
                onChangeText={(value) => {
                  const numeric = parseQuantityText(value);
                  updateIngredient(ingredient.id, {
                    quantityText: value || null,
                    quantityValue:
                      value.trim() && numeric !== undefined ? numeric : null,
                  });
                }}
              />
            </View>
            <View style={styles.flex}>
              <Input
                label="Unit"
                value={ingredient.unit ?? ''}
                maxLength={40}
                placeholder="cups"
                onChangeText={(value) =>
                  updateIngredient(ingredient.id, {
                    unit: value || null,
                  })
                }
              />
            </View>
          </View>
          <Input
            label="Preparation"
            value={ingredient.preparation ?? ''}
            maxLength={80}
            placeholder="diced, divided…"
            onChangeText={(value) =>
              updateIngredient(ingredient.id, {
                preparation: value || null,
              })
            }
          />
          {ingredient.quantityValue === null && ingredient.quantityText ? (
            <AppText variant="caption" color="accent">
              This amount is ambiguous and will not be scaled.
            </AppText>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  servingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ingredientSection: { gap: spacing.md },
  ingredientHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ingredientCard: { gap: spacing.md },
  ingredientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
