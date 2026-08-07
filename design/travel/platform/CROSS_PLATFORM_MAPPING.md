# Cross-Platform Mapping

| Concern | Shared contract | iOS | Android |
|---|---|---|---|
| Logical dimensions | token values | pt | dp |
| Text scaling | semantic roles | Dynamic Type / system scaling | sp / fontScale |
| Safe area | root scaffold | safeAreaInsets | WindowInsets |
| Shadow | semantic `card` / `floating` | shadow color/opacity/radius/y | elevation + subtle border if needed |
| Carousel | 1–3 pages | paging scroll | pager |
| Images | provider-neutral service + cache | existing image pipeline | existing image pipeline |
| Back | navigation contract | nav stack | system back |
| Accessibility | labels/order/targets | VoiceOver | TalkBack |
