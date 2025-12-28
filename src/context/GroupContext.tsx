import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GroupContextType {
  currentGroupId: string | null;
  currentGroupName: string | null;
  hasGroupContext: boolean;
  isGroupsMode: boolean;
  setCurrentGroup: (groupId: string | null, groupName: string | null) => void;
  clearCurrentGroup: () => void;
  setGroupsMode: (isGroups: boolean) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [currentGroupName, setCurrentGroupName] = useState<string | null>(null);
  const [isGroupsMode, setIsGroupsMode] = useState<boolean>(false);

  const setCurrentGroup = (groupId: string | null, groupName: string | null) => {
    setCurrentGroupId(groupId);
    setCurrentGroupName(groupName);
  };

  const clearCurrentGroup = () => {
    setCurrentGroupId(null);
    setCurrentGroupName(null);
  };

  const setGroupsMode = (isGroups: boolean) => {
    setIsGroupsMode(isGroups);
  };

  return (
    <GroupContext.Provider
      value={{
        currentGroupId,
        currentGroupName,
        hasGroupContext: !!currentGroupId,
        isGroupsMode,
        setCurrentGroup,
        clearCurrentGroup,
        setGroupsMode,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
}

