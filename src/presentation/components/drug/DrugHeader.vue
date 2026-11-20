<script setup>
// Drug name, shortage chip, identifiers and the Follow button (FR-02, FR-15). A guest gets a link to the login
// screen that returns here afterwards instead of a button.
import { computed } from 'vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { formatShortage } from '@/domain/rules/formatShortage'

const MAX_BRANDS = 3
const MAX_CLASSES = 3

const props = defineProps({
  drug: { type: Object, required: true },          // Drug360
  loggedIn: Boolean,
  followPending: Boolean,
  followError: { type: Object, default: null },
})
defineEmits(['toggle-follow'])

const shortage = computed(() => formatShortage(props.drug.shortage))
const brands = computed(() => props.drug.brandNames.slice(0, MAX_BRANDS))
const moreBrands = computed(() => Math.max(0, props.drug.brandNames.length - MAX_BRANDS))
const classes = computed(() => props.drug.atcClasses.slice(0, MAX_CLASSES))
const moreClasses = computed(() => Math.max(0, props.drug.atcClasses.length - MAX_CLASSES))
const loginTarget = computed(() => ({ name: 'auth', query: { redirect: `/drugs/${encodeURIComponent(props.drug.rxcui)}` } }))
</script>

<template>
  <section class="card header" aria-label="Drug">
    <div class="main">
      <div class="title">
        <h1>{{ drug.name }}</h1>
        <StatusChip :status="drug.shortage.status ?? 'available'" :label="shortage.title" :tone="shortage.tone" />
      </div>

      <p class="meta muted">
        <span>RxCUI {{ drug.rxcui }}</span>
        <span v-if="classes.length">
          · ATC
          <span v-for="(c, i) in classes" :key="c.id" :title="c.name">{{ c.id }}<template v-if="i < classes.length - 1">, </template></span><template v-if="moreClasses"> +{{ moreClasses }}</template>
        </span>
        <span v-if="brands.length">· {{ brands.join(', ') }}<template v-if="moreBrands"> +{{ moreBrands }} more</template></span>
      </p>

      <p v-if="drug.label.description" class="about muted">{{ drug.label.description }}</p>
    </div>

    <div class="follow">
      <button
        v-if="loggedIn"
        type="button"
        class="btn"
        :class="{ outline: drug.isFollowed }"
        :aria-pressed="drug.isFollowed"
        :disabled="followPending"
        :title="drug.isFollowed ? 'Click to unfollow' : 'Get alerts for this medicine'"
        @click="$emit('toggle-follow')"
      >{{ drug.isFollowed ? 'Following' : 'Follow' }}</button>
      <RouterLink v-else :to="loginTarget" class="btn login">Log in to follow</RouterLink>
      <p v-if="followError" class="error" role="alert">Could not update. Try again.</p>
    </div>
  </section>
</template>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
.main { flex: 1; min-width: 0; }
.title { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; }
h1 { margin: 0; overflow-wrap: anywhere; }
.meta { margin: .35rem 0 0; font-size: .88rem; }
.meta > span + span { margin-left: .25rem; }
.about { margin: .6rem 0 0; font-size: .9rem; max-width: 70ch; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.follow { display: flex; flex-direction: column; align-items: flex-end; gap: .35rem; flex: none; }
.btn { text-decoration: none; display: inline-block; }
.btn:disabled { opacity: .6; cursor: progress; }
.btn.login { background: transparent; color: var(--teal); border: 1px solid var(--teal); }
.error { margin: 0; font-size: .82rem; color: var(--coral); }
@media (max-width: 640px) { .header { flex-direction: column; } .follow { align-items: flex-start; } }
</style>
