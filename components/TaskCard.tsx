import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  task: {
    id: number;
    title: string;
    description?: string;
    reward_points: number;
    status?: string;
    disabled?: boolean;
  };
};

export default function TaskCard({ task }: Props) {
  const disabled = !!task.disabled;
  return (
    <TouchableOpacity disabled={disabled} style={{ opacity: disabled ? 0.6 : 1, marginBottom: 12 }}>
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: '#eee',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
        }}
      >
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{task.title}</Text>
        {!!task.description && <Text style={{ color: '#666', marginTop: 4 }}>{task.description}</Text>}
        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '600', color: '#6a5acd' }}>+{task.reward_points} pts</Text>
          {task.status === 'completed' ? (
            <View style={{ backgroundColor: '#e7f7e7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#2e7d32', fontWeight: '600' }}>Completed</Text>
            </View>
          ) : disabled ? (
            <View style={{ backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#888', fontWeight: '600' }}>Disabled</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#efe7ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#6a5acd', fontWeight: '600' }}>Available</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
