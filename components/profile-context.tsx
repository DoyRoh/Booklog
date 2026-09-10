"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfileSnapshot } from "@/lib/profile-snapshot";
import type { OperatorAvatar } from "@/lib/active-profile";

export type ChildAvatar = "rabbit" | "dog" | "cat";

type Profile = {
  role: string | null;
  childName: string | null;
  childAvatar: ChildAvatar | null;
  operatorAvatar: OperatorAvatar | null;
  operatorName: string | null;
  loading: boolean;
};

const ProfileContext = createContext<Profile>({ role: null, childName: null, childAvatar: null, operatorAvatar: null, operatorName: null, loading: true });

export function useProfile() {
  return useContext(ProfileContext);
}

// TopBar(제목)와 BottomNav(탭 구성)가 둘 다 "로그인한 사용자의 역할"과
// "지금 보고 있는 아이 이름"을 알아야 해서, 따로따로 조회하던 걸 한 곳으로
// 모았다 -- 화면 전환마다 두 컴포넌트가 각각 auth.getUser()+역할 조회를
// 반복하던 중복 네트워크 왕복을 줄인다. 아이를 바꾸는 화면(더보기)에서
// "chaeksup:profile-changed" 이벤트를 쏘면 다시 불러온다(router.refresh()는
// 서버 컴포넌트만 새로 그리고 이 클라이언트 컴포넌트는 다시 실행하지
// 않아서, 이벤트 없이는 상단 제목이 아이를 바꿔도 안 바뀌는 문제가 있었다).
export default function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Profile>({ role: null, childName: null, childAvatar: null, operatorAvatar: null, operatorName: null, loading: true });

  useEffect(() => {
    // 이벤트·auth 변화로 load()가 겹쳐 불리면 먼저 시작한 조회의 결과가
    // 나중에 도착해 새 상태를 덮어쓸 수 있다(프로필을 바꿨는데 하단 탭이
    // 예전 것으로 남던 원인 후보). 마지막 호출의 결과만 반영한다.
    let seq = 0;
    async function load() {
      const my = ++seq;
      const apply = (next: Profile) => {
        if (my === seq) setState(next);
      };
      const supabase = createClient();
      // getUser()는 매번 Auth 서버 왕복이라, 여기선 쿠키에 있는 세션(로컬)으로
      // id만 읽는다 -- 이후 조회는 어차피 RLS가 서버에서 검증한다.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) {
        apply({ role: null, childName: null, childAvatar: null, operatorAvatar: null, operatorName: null, loading: false });
        return;
      }
      // users.role은 온보딩 때 고른 최초 기본값일 뿐이고, 실제로 지금
      // 어느 화면(아이 프로필 vs 숲지기 프로필)을 보여줄지는
      // active_profile_type + 실제 group_members 운영진 여부로 정한다
      // (계정 하나가 두 프로필을 동시에 가질 수 있어서, 고정된 role
      // 하나로는 표현이 안 된다). "parent" | "operator" 두 값만 쓴다.
      const { activeProfile, activeChild: child } = await getProfileSnapshot(supabase, user.id);
      const role = activeProfile.type === "operator" ? "operator" : "parent";
      const childName: string | null = activeProfile.type === "child" ? (child?.name ?? null) : null;
      const childAvatar: ChildAvatar | null = activeProfile.type === "child" ? (child?.avatar ?? null) : null;
      const operatorAvatar = activeProfile.type === "operator" ? activeProfile.operatorAvatar : null;
      const operatorName = activeProfile.type === "operator" ? activeProfile.operatorName : null;
      apply({ role, childName, childAvatar, operatorAvatar, operatorName, loading: false });
    }

    load();
    window.addEventListener("chaeksup:profile-changed", load);

    // 로그인/로그아웃은 router.replace()+router.refresh()로 하는 소프트
    // 네비게이션이라, 루트 레이아웃에 마운트된 이 컴포넌트는 계정이
    // 바뀌어도 다시 마운트되지 않는다 -- onAuthStateChange 없이는 이전
    // 계정의 role이 그대로 남아 하단 탭이 새 계정과 안 맞게 뜬다(실사용
    // 중 발견: 큐레이터 계정 테스트 후 부모 계정으로 돌아왔는데 큐레이터용
    // 탭이 그대로 떠 있었음).
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // 구독 직후 바로 오는 INITIAL_SESSION은 위의 load()와 중복이라
      // 같은 조회를 두 번 왕복하지 않도록 건너뛴다.
      if (event === "INITIAL_SESSION") return;
      load();
    });

    return () => {
      window.removeEventListener("chaeksup:profile-changed", load);
      subscription.unsubscribe();
    };
  }, []);

  return <ProfileContext.Provider value={state}>{children}</ProfileContext.Provider>;
}
