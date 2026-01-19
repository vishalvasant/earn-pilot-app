import React, { useState, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ProfileEditFormProps {
  user: any;
  theme: any;
  styles: any;
  onSave: (data: { name?: string; age?: number; location?: string }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  onShowPopup: (title: string, message: string) => void;
}

const ProfileEditForm = memo<ProfileEditFormProps>(({ user, theme, styles, onSave, onCancel, isLoading, onShowPopup }) => {
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [location, setLocation] = useState(user?.location || '');

  const handleSave = async () => {
    try {
      const updateData: {
        name?: string;
        age?: number;
        location?: string;
      } = {};
      
      if (name && name.trim() !== '') {
        updateData.name = name.trim();
      }
      
      if (age && age.trim() !== '') {
        const ageNum = parseInt(age.trim(), 10);
        if (!isNaN(ageNum) && ageNum > 0) {
          updateData.age = ageNum;
        }
      }
      
      if (location && location.trim() !== '') {
        updateData.location = location.trim();
      }
      
      if (Object.keys(updateData).length === 0) {
        onShowPopup('Error', 'Please enter valid information to update');
        return;
      }

      await onSave(updateData);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  return (
    <View style={styles.profileFields}>
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
          placeholder="Enter your name"
          placeholderTextColor={theme.placeholder}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="next"
          editable={!isLoading}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
          placeholder="Enter your age"
          placeholderTextColor={theme.placeholder}
          keyboardType="number-pad"
          returnKeyType="next"
          maxLength={3}
          editable={!isLoading}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
          placeholder="Enter your location"
          placeholderTextColor={theme.placeholder}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity 
        onPress={handleSave} 
        style={[styles.saveButton, { marginTop: 20 }]}
        disabled={isLoading}
      >
        <LinearGradient
          colors={theme.gradient.primary as [string, string, ...string[]]}
          style={styles.saveGradient}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

ProfileEditForm.displayName = 'ProfileEditForm';

export default ProfileEditForm;