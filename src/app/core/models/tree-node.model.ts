import { FamilyMember } from './family-member.model';

export interface TreeNode {
  data: FamilyMember;
  x?: number;
  y?: number;
  children?: TreeNode[];
  parents?: TreeNode[];
  spouse?: TreeNode;
  siblings?: TreeNode[]; // Братья и сестры
  _children?: TreeNode[];
  collapsed?: boolean;
}

export interface TreeLink {
  source: TreeNode;
  target: TreeNode;
  type: 'parent' | 'spouse' | 'sibling';
}
