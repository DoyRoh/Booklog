"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveChild } from "@/lib/active-child";
import { getActiveProfile } from "@/lib/active-profile";

type Profile = {
  role: string | null;
  childName: string | null;
  loading: boolean;
};

const ProfileContext = createContext<Profile>({ role: null, childName: null, loading: true });

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
  const [state, setState] = useState<Profile>({ role: null, childName: null, loading: true });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState({ role: null, childName: null, loading: false });
        return;
      }
      // users.role은 온보딩 때 고른 최초 기본값일 뿐이고, 실제로 지금
      // 어느 화면(아이 프로필 vs 선생님/기관 프로필)을 보여줄지는
      // active_profile_type + 실제 group_members 운영진 여부로 정한다
      // (계정 하나가 두 프로필을 동시에 가질 수 있어서, 고정된 role
      // 하나로는 표현이 안 된다). 이렇게 계산한 값을 그대로 "role"이라는
      // 이름으로 내보내서, 이 값을 쓰는 bottom-nav/top-bar는 손댈 필요가
      // 없다.
      const activeProfile = await getActiveProfile(supabase, user.id);
      const role = activeProfile.type === "operator" ? activeProfile.operatorRole : "parent";

      let childName: string | null = null;
      if (activeProfile.type === "child") {
        const child = await getActiveChild(supabase, user.id);
        childName = child?.name ?? null;
      }
      setState({ role, childName, loading: false });
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
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      window.removeEventListener("chaeksup:profile-changed", load);
      subscription.unsubscribe();
    };
  }, []);

  return <ProfileContext.Provider value={state}>{children}</ProfileContext.Provider>;
}
