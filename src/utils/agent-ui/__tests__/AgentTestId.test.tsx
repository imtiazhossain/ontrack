import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { AgentTestId } from '../AgentTestId';
import * as registry from '../registry';

describe('AgentTestId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps layout styles when agent UI is disabled (production)', () => {
    jest.spyOn(registry, 'isAgentUiEnabled').mockReturnValue(false);

    const { toJSON } = render(
      <AgentTestId
        testID="ontrack.test.edit"
        label="Edit"
        style={{ position: 'absolute', top: 14, right: 14, width: 44, height: 44 }}>
        <Text>Edit</Text>
      </AgentTestId>,
    );

    const tree = toJSON();
    expect(tree).toMatchObject({
      type: 'View',
      props: {
        style: {
          position: 'absolute',
          top: 14,
          right: 14,
          width: 44,
          height: 44,
        },
      },
    });
  });

  it('passes children through without a wrapper when disabled and style is omitted', () => {
    jest.spyOn(registry, 'isAgentUiEnabled').mockReturnValue(false);

    const { toJSON } = render(
      <AgentTestId testID="ontrack.test.plain" label="Plain">
        <View testID="child" />
      </AgentTestId>,
    );

    expect(toJSON()).toMatchObject({
      type: 'View',
      props: { testID: 'child' },
    });
  });
});
