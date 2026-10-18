import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Keyboard, Platform, Pressable, RefreshControl, ScrollView,
  StyleProp, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon, IconName } from './icon';
import { useTheme } from '../theme';

export const TAB_SPACE = 92; // alto de la barra inferior, para que el contenido no quede tapado

export function notify(message: string, title = 'EcoSoporte Digital') {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(title, message);
}

export function confirm(message: string, onYes: () => void, title = 'Confirmar') {
  if (Platform.OS === 'web') { if (window.confirm(message)) onYes(); return; }
  Alert.alert(title, message, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aceptar', style: 'destructive', onPress: onYes }]);
}


/* ---- Teclado: sube el contenido y desplaza el campo enfocado para que nunca quede tapado ---- */
type Ensure = (input: TextInput | null) => void;
const KeyboardCtx = createContext<Ensure | null>(null);

/** Contenedor que se acorta lo que el teclado tape (no duplica si Android ya redimensiona la ventana). */
export function KeyboardScreen({ children, scroll = true, footer, bg, contentContainerStyle, refreshControl }: {
  children: ReactNode; scroll?: boolean; footer?: ReactNode; bg?: string;
  contentContainerStyle?: StyleProp<ViewStyle>; refreshControl?: React.ReactElement<any>;
}) {
  const box = useRef<View>(null);
  const sv = useRef<ScrollView>(null);
  const offset = useRef(0);
  const kbTop = useRef(Dimensions.get('window').height);
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => {
      kbTop.current = e.endCoordinates.screenY;
      box.current?.measureInWindow((_x, y, _w, h) => setOverlap(Math.max(0, y + h - e.endCoordinates.screenY)));
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      kbTop.current = Dimensions.get('window').height; setOverlap(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const ensure = useCallback<Ensure>(input => {
    if (!input) return;
    // espera a que termine la animación del teclado y entonces desplaza el campo hasta dejarlo visible
    setTimeout(() => {
      input.measureInWindow((_x, y, _w, h) => {
        const limit = kbTop.current - (footer ? 96 : 16);
        const excess = y + h + 12 - limit;
        if (excess > 0) sv.current?.scrollTo({ y: offset.current + excess, animated: true });
      });
    }, Platform.OS === 'ios' ? 80 : 280);
  }, [footer]);

  return (
    <KeyboardCtx.Provider value={ensure}>
      <View ref={box} collapsable={false} style={{ flex: 1, backgroundColor: bg, paddingBottom: overlap }}>
        {scroll ? (
          <ScrollView ref={sv} keyboardShouldPersistTaps="handled" onScroll={e => { offset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
            contentContainerStyle={contentContainerStyle} refreshControl={refreshControl}>{children}</ScrollView>
        ) : <View style={[{ flex: 1 }, contentContainerStyle as StyleProp<ViewStyle>]}>{children}</View>}
        {footer}
      </View>
    </KeyboardCtx.Provider>
  );
}

/** Pantalla con cabecera que respeta la zona segura (barra de notificaciones) y botón de volver. */
export function Screen({
  title, eyebrow, back, right, children, refreshing, onRefresh, tabs, scroll = true, footer, contentStyle,
}: {
  title?: string; eyebrow?: string; back?: boolean | (() => void); right?: ReactNode; children: ReactNode;
  refreshing?: boolean; onRefresh?: () => void; tabs?: boolean; scroll?: boolean; footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = (title || back || right) ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      {back ? (
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} color={c.ink} stroke={2.2} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={{ color: c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 }}>{eyebrow.toUpperCase()}</Text> : null}
        {title ? <Text numberOfLines={2} style={{ color: c.ink, fontSize: back ? 19 : 26, fontWeight: '800', lineHeight: back ? 24 : 31 }}>{title}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;

  const pad = {
    paddingTop: insets.top + 12, paddingHorizontal: 18,
    paddingBottom: insets.bottom + (tabs ? TAB_SPACE : 24),
  };
  const footerBar = footer ? <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.tabBar, borderTopWidth: 1, borderColor: c.line }}>{footer}</View> : null;
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <KeyboardScreen bg={c.bg} scroll={scroll} footer={footerBar} contentContainerStyle={scroll ? [pad, { flexGrow: 1 }, contentStyle] : [pad, contentStyle]}
        refreshControl={scroll && onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}>
        {scroll ? <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>{header}{children}</View> : <>{header}{children}</>}
      </KeyboardScreen>
    </>
  );
}

export function Card({ children, style, onPress, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'danger' | 'warn' | 'accent' }) {
  const { c } = useTheme();
  const bg = tone === 'danger' ? c.dangerSoft : tone === 'warn' ? c.warnSoft : tone === 'accent' ? c.accentSoft : c.card;
  const border = tone === 'danger' ? c.danger + '66' : tone === 'warn' ? c.warn + '66' : tone === 'accent' ? c.accent + '55' : c.line;
  const base: ViewStyle = { backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 11 };
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>{children}</Pressable>
    : <View style={[base, style]}>{children}</View>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
      <Text style={{ color: c.ink, fontSize: 16, fontWeight: '800' }}>{children}</Text>
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  const { c } = useTheme();
  return <Text style={[{ color: c.muted, fontSize: 12.5, lineHeight: 18 }, style]}>{children}</Text>;
}

type Tone = 'neutral' | 'accent' | 'danger' | 'warn' | 'ok';
export function Pill({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const { c } = useTheme();
  const map: Record<Tone, [string, string]> = {
    neutral: [c.cardAlt, c.muted], accent: [c.accentSoft, c.accent], danger: [c.dangerSoft, c.danger], warn: [c.warnSoft, c.warn], ok: [c.okSoft, c.ok],
  };
  const [bg, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: 11, fontWeight: '800' }}>{text}</Text></View>;
}

export const priorityTone = (p?: string): Tone => (p === 'Crítica' ? 'danger' : p === 'Alta' ? 'warn' : p === 'Baja' ? 'ok' : 'neutral');
export const statusTone = (s?: string): Tone => (s === 'Resuelto' || s === 'Cerrado' ? 'ok' : s === 'En proceso' ? 'accent' : s === 'En espera' ? 'warn' : 'neutral');

export function Btn({ title, onPress, variant = 'primary', loading, disabled, icon, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'warn'; loading?: boolean; disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const v = {
    primary: { bg: c.accent, fg: c.accentInk, bd: c.accent },
    soft: { bg: c.accentSoft, fg: c.accent, bd: c.accent },
    ghost: { bg: c.card, fg: c.ink, bd: c.line },
    danger: { bg: c.dangerSoft, fg: c.danger, bd: c.danger + '66' },
    warn: { bg: c.warn, fg: '#2D2713', bd: c.warn },
  }[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button"
      style={({ pressed }) => [{ minHeight: 50, borderRadius: 14, backgroundColor: v.bg, borderColor: v.bd, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>{icon ? <Icon name={icon} size={18} color={v.fg} /> : null}<Text style={{ color: v.fg, fontWeight: '800', fontSize: 14 }}>{title}</Text></>
      )}
    </Pressable>
  );
}

export function Field({ label, ...p }: TextInputProps & { label?: string }) {
  const { c } = useTheme();
  const ensure = useContext(KeyboardCtx);
  const ref = useRef<TextInput>(null);
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: c.ink, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>{label}</Text> : null}
      <TextInput ref={ref} placeholderTextColor={c.muted} {...p} onFocus={e => { ensure?.(ref.current); p.onFocus?.(e); }}
        style={[{ borderWidth: 1, borderColor: c.line, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.ink, fontSize: 15 }, p.multiline && { minHeight: 110, textAlignVertical: 'top' }, p.style]} />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, all, label }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; all?: string; label?: (v: T) => string }) {
  const { c } = useTheme();
  const items: (T | null)[] = all ? [null, ...options] : [...options];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12, flexGrow: 0 }}>
      {items.map(o => {
        const on = o === value;
        return (
          <Pressable key={o ?? '__all'} onPress={() => onChange(o)}
            style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: on ? c.accent : c.card, borderWidth: 1, borderColor: on ? c.accent : c.line }}>
            <Text style={{ color: on ? c.accentInk : c.muted, fontWeight: '800', fontSize: 12.5 }}>{o === null ? all : label ? label(o) : o}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Avatar({ name, size = 40, tone = 'accent' }: { name: string; size?: number; tone?: 'accent' | 'soft' }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone === 'accent' ? c.accent : c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tone === 'accent' ? c.accentInk : c.accent, fontWeight: '800', fontSize: size * 0.4 }}>{(name || '?').trim()[0]?.toUpperCase()}</Text>
    </View>
  );
}

export function IdChip({ code }: { code?: string | null }) {
  const { c } = useTheme();
  if (!code) return null;
  return <View style={{ backgroundColor: c.accentSoft, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}><Text style={{ color: c.accent, fontWeight: '800', fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{code}</Text></View>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <Card tone="danger">
      <Text style={{ color: c.danger, lineHeight: 20 }}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={{ paddingTop: 10 }}><Text style={{ color: c.accent, fontWeight: '800' }}>Reintentar</Text></Pressable> : null}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  const { c } = useTheme();
  return <Card style={{ alignItems: 'center', paddingVertical: 24 }}><Text style={{ color: c.muted, textAlign: 'center' }}>{text}</Text></Card>;
}

export function Loading({ text }: { text?: string }) {
  const { c } = useTheme();
  return <View style={{ paddingVertical: 36, alignItems: 'center', gap: 10 }}><ActivityIndicator size="large" color={c.accent} />{text ? <Text style={{ color: c.muted }}>{text}</Text> : null}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}
