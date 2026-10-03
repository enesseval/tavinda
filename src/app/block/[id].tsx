import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/controls';
import { ProgressSlider } from '../../components/ProgressSlider';
import { Sheet } from '../../components/Sheet';
import { parseTimestamp } from '../../domain/schedule';
import { t } from '../../i18n/tr';
import { deleteBlock, extendBlock, finishBlock } from '../../services/actions';
import { useNow } from '../../services/clock';
import { useAppData } from '../../services/data';
import { blockName, clockOf } from '../../ui/blockText';

/**
 * A running or finished block. When a task block's time is up we ask how far
 * the task got; that progress is saved and written on the block.
 */
export default function BlockSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const { now } = useNow();
  const block = data.blocks.find((b) => b.id === Number(id));
  const inst = block?.instanceId != null ? data.instances.find((i) => i.id === block.instanceId) : undefined;
  const [pct, setPct] = useState(inst?.progress ?? block?.fromPct ?? 0);

  if (!block) return null;
  const ended = parseTimestamp(block.endAt) <= now;
  const name = blockName(block);
  const range = `${clockOf(block.startAt)}–${clockOf(block.endAt)}`;
  const isTask = block.kind === 'task' && inst != null;

  return (
    <Sheet scroll>
      <View style={{ gap: 4 }}>
        <AppText variant="label" tone="ink2" tabular>
          {range}
        </AppText>
        <AppText variant="sheetTitle">{block.status === 'running' && ended ? t.blocks.finishTitle : name}</AppText>
        <AppText variant="body" tone="ink2">
          {isTask
            ? t.blocks.finishAsk(block.taskTitle ?? name)
            : block.status === 'running' && ended
              ? t.blocks.finishPassive(name)
              : t.blocks.nowRunning(name, clockOf(block.endAt))}
        </AppText>
      </View>

      {isTask && block.status === 'running' ? (
        <View style={{ gap: 10 }}>
          <AppText variant="hero" tabular>
            %{pct}
          </AppText>
          <ProgressSlider value={pct} onChange={setPct} />
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {block.status === 'running' ? (
          <>
            <Button
              label={isTask ? t.blocks.finishSave : t.blocks.finishDone}
              onPress={() => {
                finishBlock(block.id, isTask ? pct : undefined);
                router.back();
                // Asking what's next keeps the day filled.
                if (!isTask) setTimeout(() => router.push('/block/new'), 350);
              }}
            />
            {!ended ? <Button label={t.blocks.extend} kind="secondary" onPress={() => extendBlock(block.id, 30)} /> : null}
          </>
        ) : null}
        <Button
          label={t.blocks.delete}
          kind="destructive"
          onPress={() => {
            deleteBlock(block.id);
            router.back();
          }}
        />
      </View>
    </Sheet>
  );
}
