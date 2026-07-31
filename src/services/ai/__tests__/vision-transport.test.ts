import {
  defaultOllamaModel,
  defaultOpenAIModel,
  openAIResponseText,
  parseOpenAIJsonResponse,
} from '../vision-transport';

describe('vision-transport', () => {
  it('prefers output_text from OpenAI Responses bodies', () => {
    expect(openAIResponseText({ output_text: '{"ok":true}' })).toBe('{"ok":true}');
  });

  it('falls back to nested content text parts', () => {
    expect(
      openAIResponseText({
        output: [{ content: [{ text: '{"nested":1}' }] }],
      }),
    ).toBe('{"nested":1}');
  });

  it('parses JSON responses with domain empty/parse errors', () => {
    expect(
      parseOpenAIJsonResponse({ output_text: '{"a":1}' }),
    ).toEqual({ a: 1 });
    expect(() =>
      parseOpenAIJsonResponse(
        {},
        { emptyError: 'NO_RECIPE_FOUND', parseError: 'PROVIDER_FAILURE' },
      ),
    ).toThrow('NO_RECIPE_FOUND');
    expect(() =>
      parseOpenAIJsonResponse(
        { output_text: 'not-json' },
        { emptyError: 'NO_RECIPE_FOUND', parseError: 'PROVIDER_FAILURE' },
      ),
    ).toThrow('PROVIDER_FAILURE');
  });

  it('resolves model fallbacks', () => {
    expect(defaultOpenAIModel(undefined, 'gpt-test')).toBe('gpt-test');
    expect(defaultOllamaModel(undefined, undefined)).toBe('qwen3-vl:2b');
  });
});
